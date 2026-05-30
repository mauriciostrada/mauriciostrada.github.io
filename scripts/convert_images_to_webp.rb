#!/usr/bin/env ruby
# frozen_string_literal: true

# Convierte imágenes del sitio a WebP sin cambiar dimensiones en píxeles.
# JPEG: calidad adaptativa (q 90→80) hasta batir el tamaño original, estilo TinyPNG.
# PNG: WebP lossless (-z 9).
#
# Uso: ruby scripts/convert_images_to_webp.rb [--dry-run]

require "fileutils"
require "open3"

ROOT = File.expand_path("..", __dir__)
IMAGES_ROOT = File.join(ROOT, "assets", "images")
SKIP_DIRS = %w[visitas-source].freeze
JPEG_QUALITIES = [90, 88, 85, 82, 80].freeze
SOURCE_EXTS = %w[.jpg .jpeg .png].freeze

def dimensions(path)
  out, status = Open3.capture2("sips", "-g", "pixelWidth", "-g", "pixelHeight", path)
  return nil unless status.success?

  w = out[/pixelWidth:\s*(\d+)/, 1]&.to_i
  h = out[/pixelHeight:\s*(\d+)/, 1]&.to_i
  return [w, h] if w&.positive? && h&.positive?

  nil
end

def file_size(path)
  File.size(path)
end

def encode_webp(src, dst, lossless: false, quality: 85)
  args = if lossless
           %w[-lossless -z 9 -m 6 -mt]
         else
           ["-q", quality.to_s, "-m", "6", "-preset", "photo", "-mt", "-sns", "100"]
         end
  args += [src, "-o", dst]
  system("cwebp", *args, out: File::NULL, err: File::NULL) && File.file?(dst)
end

def best_jpeg_quality(src, tmp_dir)
  original = file_size(src)
  best = { quality: JPEG_QUALITIES.last, size: nil }

  JPEG_QUALITIES.each do |q|
    tmp = File.join(tmp_dir, "probe-#{q}.webp")
    next unless encode_webp(src, tmp, quality: q)

    size = file_size(tmp)
    if best[:size].nil? || size < best[:size]
      best = { quality: q, size: size }
    end
    File.delete(tmp) if File.file?(tmp)
    break if size < original
  end

  best
end

def collect_images
  files = []
  Dir.glob(File.join(IMAGES_ROOT, "**", "*"), File::FNM_CASEFOLD).each do |path|
    next unless File.file?(path)

    rel = path.delete_prefix("#{IMAGES_ROOT}/")
    next if SKIP_DIRS.any? { |skip| rel.start_with?(skip) }

    ext = File.extname(path).downcase
    files << path if SOURCE_EXTS.include?(ext)
  end
  files.sort
end

def update_references!
  patterns = [
    File.join(ROOT, "_data", "**", "*.yml"),
    File.join(ROOT, "_includes", "**", "*.html"),
    File.join(ROOT, "assets", "css", "**", "*.scss")
  ]
  files = patterns.flat_map { |g| Dir.glob(g) }.uniq

  files.each do |file|
    text = File.read(file)
    updated = text.gsub(/\.jpe?g\b/i, ".webp").gsub(/\.png\b/i, ".webp")
    next if updated == text

    File.write(file, updated)
    puts "  actualizado: #{file.delete_prefix("#{ROOT}/")}"
  end
end

dry_run = ARGV.include?("--dry-run")
unless system("which", "cwebp", out: File::NULL)
  warn "Error: instala cwebp (brew install webp)"
  exit 1
end

images = collect_images
puts "Imágenes a convertir: #{images.size}"
if dry_run
  puts "(modo dry-run: no se escriben archivos)"
end

tmp_dir = File.join(ROOT, ".tmp-webp-convert")
FileUtils.mkdir_p(tmp_dir) unless dry_run

total_before = 0
total_after = 0
converted = 0
skipped = 0
errors = []

images.each do |src|
  ext = File.extname(src).downcase
  dst = src.sub(/\.(jpe?g|png)\z/i, ".webp")
  before = file_size(src)
  total_before += before

  dim_before = dimensions(src)
  lossless = ext == ".png"

  if dry_run
    puts "  #{src.delete_prefix("#{ROOT}/")} → .webp (#{lossless ? 'lossless' : 'jpeg'})"
    next
  end

  ok = false
  if lossless
    ok = encode_webp(src, dst, lossless: true)
  else
    choice = best_jpeg_quality(src, tmp_dir)
    ok = encode_webp(src, dst, quality: choice[:quality])
  end

  unless ok
    errors << "#{src}: fallo cwebp"
    next
  end

  dim_after = dimensions(dst)
  if dim_before && dim_after && dim_before != dim_after
    File.delete(dst)
    errors << "#{src}: dimensiones #{dim_before} → #{dim_after}"
    next
  end

  after = file_size(dst)
  total_after += after
  File.delete(src)
  converted += 1
  pct = before.positive? ? ((1 - after.to_f / before) * 100).round(1) : 0
  puts "  ✓ #{File.basename(src)} → #{File.basename(dst)} (#{before} → #{after} B, −#{pct}%)"
rescue StandardError => e
  errors << "#{src}: #{e.message}"
end

FileUtils.rm_rf(tmp_dir) if File.directory?(tmp_dir)

unless dry_run
  puts "\nReferencias en plantillas y datos…"
  update_references!
end

saved = total_before - total_after
pct_total = total_before.positive? ? ((saved.to_f / total_before) * 100).round(1) : 0

puts "\n— Resumen —"
puts "Convertidas: #{converted} / #{images.size}"
puts "Errores: #{errors.size}"
errors.each { |e| puts "  ! #{e}" }
unless dry_run
  puts "Tamaño total: #{total_before} → #{total_after} B (−#{pct_total}%, ahorro #{saved} B)"
end

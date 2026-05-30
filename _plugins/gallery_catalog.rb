# frozen_string_literal: true

# Lectura ligera de dimensiones de imagen para reservar espacio en galerías (sin gemas).
module GalleryImageDimensions
  module_function

  def read(path)
    return nil unless File.file?(path)

    case File.extname(path).downcase
    when ".jpg", ".jpeg" then read_jpeg(path)
    when ".png" then read_png(path)
    when ".gif" then read_gif(path)
    when ".webp" then read_webp(path)
    end
  rescue StandardError
    nil
  end

  def read_jpeg(path)
    File.open(path, "rb") do |io|
      return nil unless io.read(2) == "\xFF\xD8".b

      while (marker = io.read(2)) && marker.bytesize == 2
        return nil unless marker.getbyte(0) == 0xFF

        case marker.getbyte(1)
        when 0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF
          io.read(2)
          io.read(1)
          height, width = io.read(4).unpack("nn")
          return [width, height]
        else
          len_bytes = io.read(2)
          return nil unless len_bytes && len_bytes.bytesize == 2

          length = len_bytes.unpack1("n")
          return nil unless length && length >= 2

          io.read(length - 2)
        end
      end
    end
    nil
  end

  def read_png(path)
    File.open(path, "rb") do |io|
      return nil unless io.read(8) == "\x89PNG\r\n\x1A\n".b

      length_bytes = io.read(4)
      return nil unless length_bytes && io.read(4) == "IHDR"

      width, height = io.read(8).unpack("NN")
      [width, height]
    end
  end

  def read_gif(path)
    File.open(path, "rb") do |io|
      header = io.read(6)
      return nil unless header == "GIF87a" || header == "GIF89a"

      width, height = io.read(4).unpack("v2")
      [width, height]
    end
  end

  def read_webp(path)
    File.open(path, "rb") do |io|
      riff = io.read(4)
      size = io.read(4)
      webp = io.read(4)
      return nil unless riff == "RIFF" && webp == "WEBP" && size

      chunk = io.read(8)
      return nil unless chunk && chunk.bytesize == 8

      tag = chunk[0, 4]
      case tag
      when "VP8X"
        flags = io.read(1)
        return nil unless flags

        io.read(3)
        width = io.read(3).unpack1("V") + 1
        height = io.read(3).unpack1("V") + 1
        [width, height]
      when "VP8 "
        frame = io.read(10)
        return nil unless frame && frame.bytesize == 10

        _frame_tag, width_bits, height_bits = frame.unpack("cSS")
        width = width_bits & 0x3FFF
        height = height_bits & 0x3FFF
        [width, height]
      end
    end
    nil
  end
end

module Jekyll
  class GalleryCatalogGenerator < Generator
    safe true
    priority :low

    IMAGE_EXTENSIONS = %w[.jpg .jpeg .png .webp .gif].freeze
    PREFIX_PATTERN = /\A(\d{3})_/.freeze

    def numeric_prefix(filename)
      match = filename.match(PREFIX_PATTERN)
      match ? match[1].to_i : 0
    end

    def generate(site)
      galleries_root = File.join(site.source, "assets", "images", "galleries")
      catalog = {}

      return unless File.directory?(galleries_root)

      Dir.children(galleries_root).sort.each do |slug|
        gallery_dir = File.join(galleries_root, slug)
        next unless File.directory?(gallery_dir)

        images = Dir.children(gallery_dir)
                     .select { |file| IMAGE_EXTENSIONS.include?(File.extname(file).downcase) }
                     .sort_by { |file| numeric_prefix(file) }
                     .reverse

        catalog[slug] = images.map do |file|
          basename = File.basename(file, File.extname(file))
          alt = basename.sub(/\A\d{3}_/, "").tr("-", " ")
          full_path = File.join(gallery_dir, file)
          size = GalleryImageDimensions.read(full_path)
          entry = {
            "file" => file,
            "path" => "/assets/images/galleries/#{slug}/#{file}",
            "alt" => alt
          }
          if size
            entry["width"] = size[0]
            entry["height"] = size[1]
          end
          entry
        end
      end

      site.data["gallery_catalog"] = catalog
    end
  end
end

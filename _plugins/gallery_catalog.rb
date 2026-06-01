# frozen_string_literal: true

# Lectura ligera de dimensiones de imagen (sin gemas externas) para poder
# reservar el espacio de cada foto antes de descargarla y así evitar CLS.
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
          io.read(3)
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

      io.read(4)
      return nil unless io.read(4) == "IHDR"

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

  # WebP admite tres variantes de bitstream: VP8 (lossy), VP8L (lossless) y
  # VP8X (extendido). Cada una codifica las dimensiones de forma distinta.
  def read_webp(path)
    File.open(path, "rb") do |io|
      return nil unless io.read(4) == "RIFF"

      io.read(4) # tamaño del fichero
      return nil unless io.read(4) == "WEBP"

      header = io.read(8)
      return nil unless header && header.bytesize == 8

      tag = header[0, 4]
      chunk_size = header[4, 4].unpack1("V")

      case tag
      when "VP8X"
        io.read(4) # flags + reserved
        width = io.read(3).unpack1("V") + 1
        height = io.read(3).unpack1("V") + 1
        [width, height]
      when "VP8L"
        return nil unless io.read(1) == "\x2F".b

        bits = io.read(4).unpack1("V")
        width = (bits & 0x3FFF) + 1
        height = ((bits >> 14) & 0x3FFF) + 1
        [width, height]
      when "VP8 "
        payload = io.read(chunk_size)
        return nil unless payload

        # El bloque de dimensiones va justo tras el start code 0x9D 0x01 0x2A.
        key = payload.index("\x9D\x01\x2A".b)
        return nil unless key

        dims = payload[key + 3, 4]
        return nil unless dims && dims.bytesize == 4

        width_bits, height_bits = dims.unpack("v2")
        [width_bits & 0x3FFF, height_bits & 0x3FFF]
      end
    end
  end

  # Distribución masonry: cada imagen se asigna, en el orden original, a la
  # columna con menor altura acumulada en ese momento. La "altura" de cada
  # imagen es su relación de aspecto (alto/ancho), porque todas ocupan el 100%
  # del ancho de su columna. Replica exactamente el algoritmo del cliente para
  # que el render del servidor y el de JavaScript coincidan al pixel.
  def aspect_weight(image)
    width = image["width"].to_f
    height = image["height"].to_f
    width.positive? && height.positive? ? height / width : 1.0
  end

  def distribute_columns(images, column_count)
    columns = Array.new(column_count) { [] }
    heights = Array.new(column_count, 0.0)

    images.each do |image|
      target = (0...column_count).min_by { |i| heights[i] }
      columns[target] << image
      heights[target] += aspect_weight(image)
    end

    columns
  end
end

module Jekyll
  # Genera, en tiempo de build:
  #   site.data.gallery_catalog[slug] -> lista plana de imágenes (orden original)
  #   site.data.gallery_layout[slug]  -> reparto greedy para la rejilla de escritorio
  class GalleryCatalogGenerator < Generator
    safe true
    priority :low

    IMAGE_EXTENSIONS = %w[.jpg .jpeg .png .webp .gif].freeze
    PREFIX_PATTERN = /\A(\d{3})_/.freeze
    DEFAULT_DESKTOP_COLUMNS = 3

    def numeric_prefix(filename)
      match = filename.match(PREFIX_PATTERN)
      match ? match[1].to_i : 0
    end

    def desktop_columns(site)
      config = site.config["gallery"] || {}
      count = config["columns_desktop"].to_i
      count.positive? ? count : DEFAULT_DESKTOP_COLUMNS
    end

    def generate(site)
      galleries_root = File.join(site.source, "assets", "images", "galleries")
      return unless File.directory?(galleries_root)

      catalog = {}
      layout = {}
      columns_desktop = desktop_columns(site)

      Dir.children(galleries_root).sort.each do |slug|
        gallery_dir = File.join(galleries_root, slug)
        next unless File.directory?(gallery_dir)

        files = Dir.children(gallery_dir)
                   .select { |file| IMAGE_EXTENSIONS.include?(File.extname(file).downcase) }
                   .sort_by { |file| numeric_prefix(file) }
                   .reverse

        images = files.each_with_index.map do |file, index|
          basename = File.basename(file, File.extname(file))
          alt = basename.sub(/\A\d{3}_/, "").tr("-", " ").strip
          size = GalleryImageDimensions.read(File.join(gallery_dir, file))

          entry = {
            "file" => file,
            "path" => "/assets/images/galleries/#{slug}/#{file}",
            "alt" => alt,
            "index" => index
          }
          if size
            entry["width"] = size[0]
            entry["height"] = size[1]
          end
          entry
        end

        catalog[slug] = images
        layout[slug] = GalleryImageDimensions.distribute_columns(images, columns_desktop)
      end

      site.data["gallery_catalog"] = catalog
      site.data["gallery_layout"] = layout
    end
  end
end

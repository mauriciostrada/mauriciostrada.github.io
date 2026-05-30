# frozen_string_literal: true

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

        # 001_ = última del original, nnn_ = primera; catálogo: nnn primero … 001 al final
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

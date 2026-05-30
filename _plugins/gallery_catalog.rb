# frozen_string_literal: true

module Jekyll
  class GalleryCatalogGenerator < Generator
    safe true
    priority :low

    IMAGE_EXTENSIONS = %w[.jpg .jpeg .png .webp .gif].freeze

    def generate(site)
      galleries_root = File.join(site.source, "assets", "images", "galleries")
      catalog = {}

      return unless File.directory?(galleries_root)

      Dir.children(galleries_root).sort.each do |slug|
        gallery_dir = File.join(galleries_root, slug)
        next unless File.directory?(gallery_dir)

        images = Dir.children(gallery_dir)
                     .select { |file| IMAGE_EXTENSIONS.include?(File.extname(file).downcase) }
                     .sort

        catalog[slug] = images.map do |file|
          basename = File.basename(file, File.extname(file))
          {
            "file" => file,
            "path" => "/assets/images/galleries/#{slug}/#{file}",
            "alt" => basename.tr("-", " ")
          }
        end
      end

      site.data["gallery_catalog"] = catalog
    end
  end
end

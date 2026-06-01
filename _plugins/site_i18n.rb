# frozen_string_literal: true

module Jekyll
  module SiteI18n
    module_function

    def active_lang(site)
      site.config["lang"] || site.config["default_lang"] || "es"
    end

    def locale_data(site, lang = nil)
      lang ||= active_lang(site)
      translations = site.config["translations"] || site.parsed_translations
      if translations.is_a?(Hash) && translations[lang]
        return translations[lang]
      end

      site.data.dig("i18n", lang) || site.data.dig("i18n", "es") || {}
    end

    def dig(hash, key_path)
      key_path.split(".").reduce(hash) do |memo, key|
        return nil unless memo.is_a?(Hash)

        memo[key] || memo[key.to_sym]
      end
    end

    def lang_prefix(site, lang = nil)
      lang ||= active_lang(site)
      default = site.config["default_lang"] || "es"
      lang == default ? "" : "/#{lang}"
    end

    def localized_url(site, url, lang = nil)
      lang ||= active_lang(site)
      path = url.to_s
      path = "/" if path.empty?

      langs = site.config["languages"] || [site.config["default_lang"] || "es"]
      langs.each do |code|
        prefix = "/#{code}"
        path = path.sub(%r{\A#{prefix}(?=/|$)}, "")
      end

      "#{lang_prefix(site, lang)}#{path}"
    end
  end

  module SiteI18nFilters
    def t(key, locale = nil)
      site = @context.registers[:site]
      lang = locale || SiteI18n.active_lang(site)
      data = SiteI18n.locale_data(site, lang)
      value = SiteI18n.dig(data, key.to_s)
      value.nil? ? key.to_s : value
    end

    def lang_url(path, locale = nil)
      site = @context.registers[:site]
      SiteI18n.localized_url(site, path, locale)
    end

    def lang_switch_urls
      site = @context.registers[:site]
      page = @context.registers[:page]
      path = page&.url || "/"

      site.config["languages"].to_h do |code|
        [code, SiteI18n.localized_url(site, path, code)]
      end
    end
  end

  class I18nAssignHook < Generator
    safe true
    priority :high

    def generate(site)
      site.data["i18n_languages"] = site.config["languages"] || [site.config["default_lang"] || "es"]
    end
  end
end

Liquid::Template.register_filter(Jekyll::SiteI18nFilters)

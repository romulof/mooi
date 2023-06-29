import Handlebars = require("handlebars");
import { FormatConfig, readConfig } from "../input";
import { Formatter, FormatterContext } from "./formatter";
import { Translation } from "./schema";
import * as fs from 'fs';
const fse = require('fs-extra');


export class YamlBasedFormatter implements Formatter {
    
    public async write(context: FormatterContext, translations: Translation[]): Promise<void> {
        const config = await readConfig(context.inputDir);
        if (!config?.formats) {
            return;
        }

        this.verifyNoDuplicateDefaultFormats(config.formats);

        // TODO allow multiple formats
        const format = config.formats.find(format => !format.name || format.name === 'default');

        if (!format) {
            return;
        }

        const outputPathTemplate = Handlebars.compile(format.outputPath);
        const contentTemplate = Handlebars.compile(format.format);

        const translationsByLanguageCode: Map<string, Translation[]> = new Map();
        for (const translation of translations) {
            const translationsForLanguage = translationsByLanguageCode.get(translation.languageCode) ?? [];
            translationsForLanguage.push(translation);
            translationsByLanguageCode.set(translation.languageCode, translationsForLanguage);
        }

        for (const [languageCode, translationsForLanguage] of translationsByLanguageCode) {
            const content = contentTemplate({
                languageCode,
                translations: translationsForLanguage,
            });

            const outputPath = outputPathTemplate({
                languageCode,
            });

            fse.ensureFileSync(outputPath);

            fs.writeFileSync(outputPath, content);
        }
    }

    private verifyNoDuplicateDefaultFormats(formats: FormatConfig[]) {
        if (formats.filter(format => !format.name || format.name === 'default').length > 1) {
            throw new Error(`Only one format can be named default`);
        }
    }

}
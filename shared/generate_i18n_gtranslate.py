#!/usr/bin/env python2.7

"""
We want python 2.7 again...
"""

import io
import re
import json
import sys

"""
from googletrans import Translator  # Use the free webhook
def run_translate(messages, source_language, target_language):
    translator = Translator()
    _translations = translator.translate(messages, src=source_language, dest=target_language)
    result = []
    for translation in _translations:
        result.append({
            "source": translation.origin,
            "translated": translation.text
        })
    return result
"""


from google.cloud import translate  # Use googles could solution
def run_translate(messages, source_language, target_language):
    translate_client = translate.Client()

    # The text to translate
    text = u'Hello, world!'
    # The target language

    result = []
    limit = 16
    for chunk in [messages[i:i + limit] for i in xrange(0, len(messages), limit)]:
        # Translates some text into Russian
        print("Requesting {} translations".format(len(chunk)))
        translations = translate_client.translate(chunk, target_language=target_language)

        for translation in translations:
            result.append({
                "source": translation["input"],
                "translated": translation["translatedText"]
            })
    return result


def translate_messages(source, destination, target_language):
    with open(source) as f:
        data = json.load(f)

    result = {
        "translations": [],
        "info": None
    }
    try:
        with open(destination) as f:
            result = json.load(f)
            print("loaded old result")
    except:
        pass

    translations = result["translations"]
    if translations is None:
        print("Using new translation map")
        translations = []
    else:
        print("Loaded {} old translations".format(len(translations)))

    messages = []
    for message in data:
        try:
            messages.index(message["message"])
        except:
            try:
                found = False
                for entry in translations:
                    if entry["key"]["message"] == message["message"]:
                        found = True
                        break
                if not found:
                    raise Exception('add message for translate')
            except:
                messages.append(message["message"])

    print("Translating {} messages".format(len(messages)))
    if len(messages) != 0:
        _translations = run_translate(messages, 'en', target_language)
        print("Messages translated, generating target file")

        for translation in _translations:
            translations.append({
                "key": {
                    "message": translation["source"]
                },
                "translated": translation["translated"],
                "flags": [
                    "google-translate"
                ]
            })
    for translation in translations:
        translation["translated"] = re.sub(r"% +([OoDdSs])", r" %\1", translation["translated"]) # Fix the broken "% o" or "% s" things
        translation["translated"] = translation["translated"].replace("%O", "%o")                # Replace all %O to %o
        translation["translated"] = translation["translated"].replace("%S", "%s")                # Replace all %S to %s
        translation["translated"] = translation["translated"].replace("%D", "%d")                # Replace all %D to %d
        translation["translated"] = re.sub(r"  +(%[ods])", r" \1", translation["translated"])    # Fix double spaces between a message and %s
        translation["translated"] = re.sub(r"\( (%[ods])", r"(\1", translation["translated"])    # Fix the leading space after a brace: ( %s)

    print("Writing target file")
    result["translations"] = translations
    if result["info"] is None:
        result["info"] = {
            "contributors": [
                {
                    "name": "Google Translate, via script by Markus Hadenfeldt",
                    "email": "gtr.i18n.client@teaspeak.de"
                }
            ],
            "name": "Auto translated messages for language " + target_language
        }

    with io.open(destination, 'w', encoding='utf8') as f:
        f.write(json.dumps(result, indent=2, ensure_ascii=False))
    print("Done")


def main(target_language):
    target_file = "i18n/{}_google_translate.translation".format(target_language)

    translate_messages("generated/messages_script.json", target_file, target_language)
    translate_messages("generated/messages_template.json", target_file, target_language)
    pass


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Invalid argument count!")
        print("Usage: ./generate_i18n_gtranslate.py <language>")
        exit(1)

    main(sys.argv[1])

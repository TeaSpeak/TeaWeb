"""
We want python 2.7 again...
"""

import json

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

    result = {}
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
    # TODO translate

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

    with open(destination, 'w') as f:
        f.write(json.dumps(result, indent=2))
    print("Done")


def main():
    #print(run_translate(["Hello World", "Bla bla bla", "Im a unicorn"], "en", "de"))
    translate_messages("generated/messages_script.json", "test.json", "de")
    translate_messages("generated/messages_template.json", "test.json", "de")
    pass


if __name__ == "__main__":
    main()

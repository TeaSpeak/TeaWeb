"""
This should be executed with python 2.7 (because of pydub)

Used voice: UK-Graham
"""

import os
import os.path
import string
import base64
import sys
import requests
import json
import csv
import shutil
from pydub import AudioSegment

TARGET_DIRECTORY = "audio/speech"
SOURCE_FILE = "audio/speech_sentences.csv"

"""
We cant use the automated way because this now requires a security token and the AWS server does bot exists anymore
def tts(text, file):
    voice_id = 4
    language_id = 1
    req = requests.post(
        'https://kfiuqykx63.execute-api.us-east-1.amazonaws.com/Dev/tts?r={}&s={}&l=0&v=aca'.format(voice_id,
                                                                                                    language_id),
        stream=True,
        headers={
            'origin': 'https://www.naturalreaders.com',
            'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/69.0.3497.100 Safari/537.36 OPR/56.0.3051.52',
            'content-type': 'application/x-www-form-urlencoded',
            'referer': 'https://www.naturalreaders.com/online/',
            'authority': 'kfiuqykx63.execute-api.us-east-1.amazonaws.com' #You may need to change that here
        },
        data=json.dumps({"t": text})
    )

    if req.status_code != 200:
        raise ValueError("Invalid response code {}".format(req.status_code))

    with open(file + ".mp3", "wb") as fstream:
        for chunk in req.iter_content(chunk_size=128):
            fstream.write(chunk)
        fstream.close()

    sound = AudioSegment.from_mp3(file + ".mp3")
    sound.export(file, format="wav")

    os.remove(file + ".mp3")
"""


def main():
    if False:
        if os.path.exists(TARGET_DIRECTORY):
            print("Deleting old speach directory (%s)!" % TARGET_DIRECTORY)
            try:
                shutil.rmtree(TARGET_DIRECTORY)
            except e:
                print("Cant delete old dir!")
    try:
        os.makedirs(TARGET_DIRECTORY)
    except:
        pass

    mapping_file = 'audio/speech/mapping.json'
    mapping = []

    with open(mapping_file, "r") as fstream:
        mapping = json.loads(fstream.read())

    tts_queue = []
    with open(SOURCE_FILE, 'r') as input:
        reader = csv.reader(filter(lambda row: len(row) != 0 and row[0] != '#', input), delimiter=';', quotechar='#')
        for row in reader:
            if len(row) != 2:
                continue

            file = TARGET_DIRECTORY + "/" + "{}.wav".format(row[0])

            _object = filter(lambda e: e["key"] == row[0], mapping)
            if len(_object) > 0:
                _object = _object[0]
                if os.path.exists(TARGET_DIRECTORY + "/" + _object["file"]):
                    print("Skipping speech generation for {} ({}). File already exists".format(row[0], file))
                    continue

            print("Enqueuing speech generation for {} ({}): {}".format(row[0], file, row[1]))
            tts_queue.append([row[0], file, row[1]])

    if len(tts_queue) == 0:
        print("No sounds need to be generated!")
        return

    print(tts_queue)
    print("Please generate HSR file for the following text:")
    for entry in tts_queue:
        print(entry[2])
        print("")

    print("-" * 30)
    print("Enter the HSR file path")
    file = ""  # /home/wolverindev/Downloads/www.naturalreaders.com.har
    while True:
        if len(file) > 0:
            if os.path.exists(file):
                break
            print("Invalid file try again")
        file = string.strip(sys.stdin.readline())
        print("Testing file {}".format(file))

    with open(file, "r") as fstream:
        data = json.loads(fstream.read())
        entries = data["log"]["entries"]
        for entry in entries:
            if not entry["request"]["url"].startswith('https://pweb.naturalreaders.com/v0/tts?'):
                continue
            if not (entry["request"]["method"] == "POST"):
                continue

            post_data = json.loads(entry["request"]["postData"]["text"])
            key = post_data["t"]
            tts_entry = filter(lambda e: e[2] == key, tts_queue)
            if len(tts_entry) == 0:
                print("Missing generated speech text handle for: {}".format(key))
                continue
            tts_entry = tts_entry[0]
            tts_queue.remove(tts_entry)

            print(tts_entry)
            with open(tts_entry[1] + ".mp3", "wb") as mp3_tmp:
                mp3_tmp.write(base64.decodestring(entry["response"]["content"]["text"]))
                mp3_tmp.close()

            sound = AudioSegment.from_mp3(tts_entry[1] + ".mp3")
            sound.export(tts_entry[1], format="wav")
            os.remove(tts_entry[1] + ".mp3")

            mapping.append({
                'key': tts_entry[0],
                'file': "{}.wav".format(tts_entry[0])
            })

    print("FILE DONE!")
    with open(mapping_file, "w") as fstream:
        fstream.write(json.dumps(mapping))
        fstream.close()

    pass


if __name__ == "__main__":
    main()

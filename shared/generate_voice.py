"""
This should be executed as python 2.7 (because of pydub)
"""
import os
import requests
import json
import csv
import shutil
from pydub import AudioSegment

TARGET_DIRECTORY = "audio/speech"
SOURCE_FILE = "audio/speech_sentences.csv"


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
            'authority': 'kfiuqykx63.execute-api.us-east-1.amazonaws.com'
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

def main():
    if os.path.exists(TARGET_DIRECTORY):
        print("Deleting old speach directory (%s)!" % TARGET_DIRECTORY)
        try:
            shutil.rmtree(TARGET_DIRECTORY)
        except e:
            print("Cant delete old dir!")
    os.makedirs(TARGET_DIRECTORY)

    mapping = []
    with open(SOURCE_FILE, 'r') as input:
        reader = csv.reader(filter(lambda row: len(row) != 0 and row[0] != '#', input), delimiter=';', quotechar='#')
        for row in reader:
            if len(row) != 2:
                continue
            print("Generating speech for {}: {}".format(row[0], row[1]))
            try:
                file = "{}.wav".format(row[0])
                tts(row[1], TARGET_DIRECTORY + "/" + file)

                mapping.append({'key': row[0], 'file': file})
            except e:
                print(e)
                print("Failed to generate {}", row[0])

    with open("audio/speech/mapping.json", "w") as fstream:
        fstream.write(json.dumps(mapping))
        fstream.close()

    pass


if __name__ == "__main__":
    main()

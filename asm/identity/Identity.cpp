#include "Identity.h"
#include <iostream>
#include "base64.h"

#define SHA_DIGEST_LENGTH 20
#define ECC_TYPE_INDEX 5

static const char *TSKEY =
		"b9dfaa7bee6ac57ac7b65f1094a1c155"
		"e747327bc2fe5d51c512023fe54a2802"
		"01004e90ad1daaae1075d53b7d571c30"
		"e063b5a62a4a017bb394833aa0983e6e";

using namespace std;

inline int SHA1(const char* input, size_t length, char* result) {
	hash_state ctx = {};
	if (sha1_init(&ctx) != CRYPT_OK)
	{ return -1; }
	if (sha1_process(&ctx, (uint8_t*) input, length) != CRYPT_OK)
	{ return -1; }
	if (sha1_done(&ctx, (uint8_t*) result) != CRYPT_OK)
	{ return -1; }
	return 0;
}

static int decriptIdentity(char *data, uint32_t length) {
	int dataSize = std::min((uint32_t) 100, length);
	for (int i = 0; i < dataSize; i++) {
		data[i] ^= TSKEY[i];
	}

	char hash[SHA_DIGEST_LENGTH];
	//if(SHA1(data + 20, strlen(data + 20), hash) < 0) return -1;

	hash_state ctx = {};
	if (sha1_init(&ctx) != CRYPT_OK)
	{ return -1; }
	if (sha1_process(&ctx, (uint8_t*)data + 20, strlen(data + 20)) != CRYPT_OK)
	{ return -1; }
	if (sha1_done(&ctx, (uint8_t*)hash) != CRYPT_OK)
	{ return -1; }


	for (int i = 0; i < 20; i++) {
		data[i] ^= hash[i];
	}

	return 0;
}

static int encriptIdentity(char *data, uint32_t length) {
	char hash[SHA_DIGEST_LENGTH];
	//if(SHA1(data, length, hash) < 0) return -1;

	hash_state ctx;
	if (sha1_init(&ctx) != CRYPT_OK)
	{ return -1; }
	if (sha1_process(&ctx, (uint8_t*)data + 20, strlen(data + 20)) != CRYPT_OK)
	{ return -1; }
	if (sha1_done(&ctx, (uint8_t*)hash) != CRYPT_OK)
	{ return -1; }


	for (int i = 0; i < 20; i++) {
		data[i] ^= hash[i];
	}

	int dataSize = std::min((uint32_t) 100, length);
	for (int i = 0; i < dataSize; i++) {
		data[i] ^= TSKEY[i];
	}
	return 0;
}

namespace ts {
	Identity* Identity::createNew() {
		auto result = new Identity();

		prng_state rndState = {};
		memset(&rndState, 0, sizeof(prng_state));
		int err;

		result->keyPair = new ecc_key;

		//cout << " -> " << find_prng("sprng") << endl;
		if((err = ecc_make_key_ex(&rndState, find_prng("sprng"), result->keyPair, &ltc_ecc_sets[ECC_TYPE_INDEX])) != CRYPT_OK){
			printf("Cant create a new identity (Keygen)\n");
			printf("Message: %s\n", error_to_string(err));
			delete result;
			return nullptr;
		}

		return result;
	}

	Identity* Identity::parse(const std::string& data, std::string& error) {
		int vindex = data.find('V');
		if(vindex <= 0) {
			error = "Invalid structure";
			return nullptr;
		}

		auto slevel = data.substr(0, vindex);
		if(slevel.find_first_not_of("0123456789") != std::string::npos) {
			error = "Invalid offset (" + slevel + ")";
			return nullptr;
		}
		mp_int keyOffset{};
		mp_init(&keyOffset);
		mp_read_radix(&keyOffset, slevel.data(), 10);

		auto keyData = data.substr(vindex + 1);
		keyData = base64::decode(keyData);
		if(encriptIdentity(&keyData[0], keyData.length()) < 0) {
			error = "Could not decrypt key";
			return nullptr;
		}

		auto identity = new Identity(base64::decode(keyData), keyOffset, keyOffset);
		if(!identity->keyPair) {
			error = "Could not load key";
			delete identity;
			return nullptr;
		}
		printf("X: %s | %s\n", slevel.c_str(), identity->lastValidKeyOffsetString().c_str());
		return identity;
	}

	Identity::Identity(const std::string& asnStruct, mp_int keyOffset, mp_int lastCheckedOffset) {
		this->keyOffset = keyOffset;
		this->lastCheckedOffset = lastCheckedOffset;
		importKey(asnStruct);

		mp_init_copy(&this->keyOffset, &keyOffset);
		mp_init_copy(&this->lastCheckedOffset, &lastCheckedOffset);
	}

	Identity::Identity() {
		mp_init_multi(&this->keyOffset, &this->lastCheckedOffset, nullptr);
		this->keyPair = nullptr;
	}

	Identity::~Identity() {
		delete this->keyPair;
		this->keyPair = nullptr;

		mp_clear_multi(&this->keyOffset, &this->lastCheckedOffset, nullptr);
	}

	void Identity::importKey(std::string asnStruct) {
		this->keyPair = new ecc_key;
		int err;
		if((err = ecc_import_ex((const unsigned char *) asnStruct.data(), asnStruct.length(), this->keyPair, &ltc_ecc_sets[ECC_TYPE_INDEX])) != CRYPT_OK){
			delete this->keyPair;
			this->keyPair = nullptr;

			printf("Cant import identity from asn structure\n");
			printf("Message: %s\n", error_to_string(err));
			return;
		}
	}

	std::string Identity::exportIdentity() {
		std::string data = privateKey();
		decriptIdentity((char *) data.data(), data.length());
		return this->lastValidKeyOffsetString() + "V" + base64_encode(data);
	}

	std::string Identity::uid() {
		char buffer[SHA_DIGEST_LENGTH];
		auto key = this->publicKey();
		SHA1(key.data(), key.length(), buffer);
		return base64::encode(buffer, SHA_DIGEST_LENGTH);
	}

	inline string hex(string input, char beg, char end){
		assert(end - beg  == 16);

		int len = input.length() * 2;
		char output[len];
		int idx = 0;
		for(int index = 0; index < input.length(); index++){
			char elm = input[index];
			output[idx++] = static_cast<char>(beg + ((elm >> 4) & 0x0F));
			output[idx++] = static_cast<char>(beg + ((elm & 0x0F) >> 0));
		}

		return string(output, len);
	}

	std::string Identity::avatarId() {
		return hex(base64::decode(this->uid()), 'a', 'q');
	}

	std::string Identity::publicKey() {
		assert(this->keyPair);

		ulong32 bufferLength = 1028;
		char buffer[bufferLength];
		ecc_export((unsigned char *) buffer, &bufferLength, PK_PUBLIC, this->keyPair);

		return base64_encode(std::string(buffer, bufferLength));
	}

	std::string Identity::privateKey() {
		assert(this->keyPair);

		ulong32 bufferLength = 1028;
		char buffer[bufferLength];
		ecc_export((unsigned char *) buffer, &bufferLength, PK_PRIVATE, this->keyPair);

		return base64_encode(std::string(buffer, bufferLength));
	}

	ecc_key& Identity::getPrivateKey() {
		return *keyPair;
	}

#define MaxUlongString 20

	bool Identity::improveSecurityLevel(int target) {
		auto publicKey = this->publicKey();
		char hashBuffer[publicKey.length() + MaxUlongString];
		memcpy(hashBuffer, publicKey.data(), publicKey.length());

		if(mp_cmp(&this->lastCheckedOffset, &this->keyOffset) < 0)
			mp_copy(&this->keyOffset, &this->lastCheckedOffset);
		int best = getSecurityLevel(hashBuffer, publicKey.length(), this->lastCheckedOffset);
		while(true){
			if(best >= target) return true;

			int currentLevel = getSecurityLevel(hashBuffer, publicKey.length(), this->lastCheckedOffset);
			if(currentLevel >= best){
				this->keyOffset = this->lastCheckedOffset;
				best = currentLevel;
			}
			mp_add_d(&this->lastCheckedOffset, 1, &this->lastCheckedOffset);
		}
	}

	int Identity::getSecurityLevel() {
		auto length = publicKey().length();
		char hashBuffer[length + MaxUlongString];

		auto publicKey = this->publicKey();
		memcpy(hashBuffer, publicKey.data(), publicKey.length());

		return getSecurityLevel(hashBuffer, publicKey.length(), this->keyOffset);
	}

	int Identity::getSecurityLevel(char *hashBuffer, size_t keyLength, mp_int offset) {
		char numBuffer[MaxUlongString];
		mp_todecimal(&offset, numBuffer);
		/*
		int numLen = 0;
		do {
			numBuffer[numLen] = '0' + (offset % 10);
			offset /= 10;
			numLen++;
		} while(offset > 0);
		for(int i = 0; i < numLen; i++)
			hashBuffer[keyLength + i] = numBuffer[numLen - (i + 1)];
		 */
		auto numLen = strlen(numBuffer);
		memcpy(&hashBuffer[keyLength], numBuffer, numLen);

		char shaBuffer[SHA_DIGEST_LENGTH];
		SHA1(hashBuffer, keyLength + numLen, shaBuffer);

		//Leading zero bits
		int zeroBits = 0;
		int i;
		for(i = 0; i < SHA_DIGEST_LENGTH; i++)
			if(shaBuffer[i] == 0) zeroBits += 8;
			else break;
		if(i < SHA_DIGEST_LENGTH)
			for(int bit = 0; bit < 8; bit++)
				if((shaBuffer[i] & (1 << bit)) == 0) zeroBits++;
				else break;
		return zeroBits;
	}
}
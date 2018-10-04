#include <cstdio>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <tomcrypt.h>
#include <cmath>
#include <iostream>
#include "Identity.h"
#include "base64.h"
#define INI_MAX_LINE 1024
#include "INIReader.h"

using namespace emscripten;
using namespace std;
extern "C" {
	std::string errorMessage = "";

	inline const char* cstr(const std::string& message) {
		auto buffer = (char*) malloc(message.length() + 1);
		cout << "Allocating at " << (void*) buffer << endl;
		buffer[message.length()] = '\0';
		memcpy(buffer, message.data(), message.length());
		return buffer;
	}

	EMSCRIPTEN_KEEPALIVE
	const char* last_error_message() {
		return cstr(errorMessage);
	};

	EMSCRIPTEN_KEEPALIVE
	void destroy_string(const char* str) {
		cout << "Deallocating at " << (void*) str << endl;
		if(str) free((void *) str);
	};

	inline void clear_error() { errorMessage = ""; }

	EMSCRIPTEN_KEEPALIVE
	int tomcrypt_initialize() {
		init_LTM();
		if(register_prng(&sprng_desc) == -1) {
			printf("could not setup prng\n");
			return EXIT_FAILURE;
		}
		if (register_cipher(&rijndael_desc) == -1) {
			printf("could not setup rijndael\n");
			return EXIT_FAILURE;
		}
		cout << "Initialized!" << endl;
		return 0;
	}

	EMSCRIPTEN_KEEPALIVE
	void* parse_identity(const char* input) {
		cout << "Got messsage: " << input << endl;
		clear_error();
		return ts::Identity::parse(input, errorMessage);
	}

	EMSCRIPTEN_KEEPALIVE
	void* parse_identity_file(const char* input) {
		clear_error();
		INIReader reader(input, true);
		if(reader.ParseError() != 0) {
			errorMessage = "Could not parse file " + to_string(reader.ParseError());
			return nullptr;
		}
		auto identity = reader.Get("Identity", "identity", "");
		if(!identity.empty() && identity[0] == '"')
			identity = identity.substr(1);
		if(!identity.empty() && identity.back() == '"')
			identity = identity.substr(0, identity.length() - 1);
		if(identity.empty()) {
			errorMessage = "Mussing identity value at Identity::identity";
			return nullptr;
		}
		return ts::Identity::parse(identity, errorMessage);
	}

#define IDENTITIEFY(_ret) \
auto identity = dynamic_cast<ts::Identity*>((ts::Identity*) ptrIdentity); \
if(!identity) { \
	errorMessage = "Invalid identity pointer!"; \
	return _ret; \
}


	EMSCRIPTEN_KEEPALIVE
	void delete_identity(void* ptrIdentity) {
		IDENTITIEFY(;);
		delete identity;
	}

	EMSCRIPTEN_KEEPALIVE
	const char* identity_security_level(void* ptrIdentity) {
		IDENTITIEFY("");
		return cstr(std::to_string(identity->getSecurityLevel()));
	}

	EMSCRIPTEN_KEEPALIVE
	const char* identity_export(void* ptrIdentity) {
		IDENTITIEFY("");
		return cstr(identity->exportIdentity());
	}

	EMSCRIPTEN_KEEPALIVE
	const char* identity_key_public(void* ptrIdentity) {
		IDENTITIEFY("");
		return cstr(identity->publicKey());
	}

	EMSCRIPTEN_KEEPALIVE
	const char* identity_uid(void* ptrIdentity) {
		IDENTITIEFY("");
		return cstr(identity->uid());
	}

	EMSCRIPTEN_KEEPALIVE
	const char* identity_sign(void* ptrIdentity, const char* message, int length) {
		IDENTITIEFY("");

		ulong32 bufferLength = 128;
		char signBuffer[bufferLength];

		prng_state rndState = {};
		memset(&rndState, 0, sizeof(prng_state));

		auto state = ecc_sign_hash((const unsigned char*) message, length, reinterpret_cast<unsigned char *>(signBuffer), &bufferLength, &rndState, find_prng("sprng"), identity->getKeyPair());
		if(state != CRYPT_OK) {
			errorMessage = "Could not sign message (" + std::string(error_to_string(state)) + "|" + std::to_string(state) + ")";
			return "";
		}

		return cstr(base64::encode(signBuffer, bufferLength));
	}
}
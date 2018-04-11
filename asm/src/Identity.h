#pragma once

#include <tomcrypt.h>
#include <string>
#include <tommath.h>

namespace ts {
	class Identity {
			inline std::string toString(const mp_int& num) {
				char buffer[1024];
				mp_todecimal(&num, buffer);
				return std::string(buffer);
			}
		public:
			static Identity* createNew();
			static Identity* parse(const std::string&, std::string&);

			Identity(const std::string& asnStruct,mp_int keyOffset,mp_int lastCheckedOffset);
			~Identity();

			bool valid(){ return keyPair != nullptr; }

			std::string uid();
			std::string avatarId();

			std::string publicKey();
			std::string privateKey();
			std::string exportIdentity();

			ecc_key* getKeyPair(){
				return keyPair;
			}

			ecc_key& getPrivateKey();

			bool improveSecurityLevel(int target);
			int getSecurityLevel();

			mp_int lastValidKeyOffset(){ return keyOffset; }
			mp_int lastTestedKeyOffset(){ return lastCheckedOffset; }

			std::string lastValidKeyOffsetString(){
				return toString(this->lastValidKeyOffset());
			}

			std::string lastTestedKeyOffsetString(){
				return toString(this->lastTestedKeyOffset());
			}
		private:
			Identity();

			int getSecurityLevel(char* hasBuffer, size_t keyLength, mp_int offset);
			void importKey(std::string asn1);

			ecc_key* keyPair = nullptr;
			mp_int keyOffset;
			mp_int lastCheckedOffset;
	};
}
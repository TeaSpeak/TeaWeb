#pragma once

#include <string>
#include <tomcrypt.h>
#include <iostream>


namespace base64 {
	/**
	* Encodes a given string in Base64
	* @param input The input string to Base64-encode
	* @param inputSize The size of the input to decode
	* @return A Base64-encoded version of the encoded string
	*/
	inline std::string encode(const char* input, const unsigned long inputSize) {
		auto outlen = static_cast<unsigned long>(inputSize + (inputSize / 3.0) + 16);
		auto outbuf = new unsigned char[outlen]; //Reserve output memory
		if(base64_encode((unsigned char*) input, inputSize, outbuf, &outlen) != CRYPT_OK){
			std::cerr << "Invalid input '" << input << "'" << std::endl;
			return "";
		}
		std::string ret((char*) outbuf, outlen);
		delete[] outbuf;
		return ret;
	}

	/**
	* Encodes a given string in Base64
	* @param input The input string to Base64-encode
	* @return A Base64-encoded version of the encoded string
	*/
	inline std::string encode(const std::string& input) { return encode(input.c_str(), input.size()); }


	/**
	* Decodes a Base64-encoded string.
	* @param input The input string to decode
	* @return A string (binary) that represents the Base64-decoded data of the input
	*/
	inline std::string decode(const char* input, ulong32 size) {
		auto out = new unsigned char[size];
		if(base64_strict_decode((unsigned char*) input, size, out, &size) != CRYPT_OK){
			std::cerr << "Invalid base 64 string '" << input << "'" << std::endl;
			return "";
		}
		std::string ret((char*) out, size);
		delete[] out;
		return ret;
	}

	/**
	* Decodes a Base64-encoded string.
	* @param input The input string to decode
	* @return A string (binary) that represents the Base64-decoded data of the input
	*/
	inline std::string decode(const std::string& input) { return decode(input.c_str(), input.size()); }
}
inline std::string base64_encode(const char* input, const unsigned long inputSize) { return base64::encode(input, inputSize); }
inline std::string base64_encode(const std::string& input) { return base64::encode(input.c_str(), input.size()); }
;; SHA-1 code from https://github.com/Snack-X/wasm-works/blob/master/modules/sha1.wat by Snack-X
;; TODO: Cache the sha1 state after the first 64 bytes.
;;       Maybe as well for 128 bytes. But this block may be recalculated on number change because not every identity is 128 bytes long
(module
  ;; import 1 page of memory from env.memory
  ;; [0x000;0x03f] will be used as input chunk
  ;; [0x040;0x053] will be used as output value
  ;; [0x0A0;0x1FF] base64 memory
  (import "env" "memory" (memory 1))

  ;; functions to export
  (export "mine" (func $mine))

  ;; global variables
  (global $message_len (mut i32) (i32.const 0))
  (global $h0 (mut i32) (i32.const 0))
  (global $h1 (mut i32) (i32.const 0))
  (global $h2 (mut i32) (i32.const 0))
  (global $h3 (mut i32) (i32.const 0))
  (global $h4 (mut i32) (i32.const 0))

  ;; helper function `get_word`
  ;; input  - word index
  ;; output - offset
  (func $get_word (param $w i32) (result i32)
    ;; offset = ($w & 0xf) * 4
    (return (call $flip_endian (i32.load
      (i32.mul
        (i32.and (get_local $w) (i32.const 0xf))
        (i32.const 4)
      )
    )))
  )

  ;; helper function `set_word`
  ;; input  - word index, value
  (func $set_word (param $w i32) (param $v i32)
    ;; offset = ($w & 0xf) * 4
    (i32.store (call $flip_endian
      (i32.mul
        (i32.and (get_local $w) (i32.const 0xf))
        (i32.const 4)
      )
      (get_local $v)
    ))
  )

  ;; helper function `flip_endian`
  ;; once `i32.bswap` is landed, this function is useless
  (func $flip_endian (param $w i32) (result i32)
    ;; (w & 0xff000000 >>> 24) |
    ;; (w & 0x00ff0000 >>>  8) |
    ;; (w & 0x0000ff00 <<   8) |
    ;; (w & 0x000000ff <<  24)
    (return (i32.or
      (i32.or
        (i32.shr_u (i32.and (get_local $w) (i32.const 0xff000000)) (i32.const 24))
        (i32.shr_u (i32.and (get_local $w) (i32.const 0x00ff0000)) (i32.const  8))
      )
      (i32.or
        (i32.shl   (i32.and (get_local $w) (i32.const 0x0000ff00)) (i32.const  8))
        (i32.shl   (i32.and (get_local $w) (i32.const 0x000000ff)) (i32.const 24))
      )
    ))
  )

  ;; function `sha1_init`
  ;; initialize memory
  (func $sha1_init
    (i64.store (i32.const 0x00) (i64.const 0))
    (i64.store (i32.const 0x08) (i64.const 0))
    (i64.store (i32.const 0x10) (i64.const 0))
    (i64.store (i32.const 0x18) (i64.const 0))
    (i64.store (i32.const 0x20) (i64.const 0))
    (i64.store (i32.const 0x28) (i64.const 0))
    (i64.store (i32.const 0x30) (i64.const 0))
    (i64.store (i32.const 0x38) (i64.const 0))

    (set_global $message_len (i32.const 0))
    (set_global $h0 (i32.const 0x67452301))
    (set_global $h1 (i32.const 0xefcdab89))
    (set_global $h2 (i32.const 0x98badcfe))
    (set_global $h3 (i32.const 0x10325476))
    (set_global $h4 (i32.const 0xc3d2e1f0))
  )

  ;; function `sha1_update`
  ;; process full block
  (func $sha1_update
    ;; word counter
    (local $w i32)

    ;; internal variables
    (local $a i32) (local $b i32) (local $c i32) (local $d i32) (local $e i32)
    (local $f i32) (local $k i32) (local $t i32)

    ;; message_len += 64 bytes (512 bits)
    (set_global $message_len (i32.add (get_global $message_len) (i32.const 64)))

    ;; load h0 ~ h4
    (set_local $a (get_global $h0))
    (set_local $b (get_global $h1))
    (set_local $c (get_global $h2))
    (set_local $d (get_global $h3))
    (set_local $e (get_global $h4))

    ;; loop
    (set_local $w (i32.const 0))
    (block $done
      (loop $loop
        ;; word 0 ~ 15 will be used as-is on memory
        ;; word 16 ~ 79 will be calculated and replaced on memory
        (if
          ;; if 16 <= $w
          (i32.ge_s (get_local $w) (i32.const 16))

          ;; calculate word to use
          (call $set_word
            (get_local $w)
            ;; value = (words[w-3] ^ words[w-8] ^ words[w-14] ^ words[w-16]) rotl 1
            (i32.rotl
              (i32.xor
                (i32.xor
                  (call $get_word (i32.sub (get_local $w) (i32.const  3)))
                  (call $get_word (i32.sub (get_local $w) (i32.const  8)))
                )
                (i32.xor
                  (call $get_word (i32.sub (get_local $w) (i32.const 14)))
                  (call $get_word (i32.sub (get_local $w) (i32.const 16)))
                )
              )
              (i32.const 1)
            )
          )
        )

        ;; calculate f and determine k
        (block $get_key
          (if (i32.lt_s (get_local $w) (i32.const 20))
            (block ;; depth: 6
              ;; f = (b & c) | (~b & d)
              (set_local $f
                (i32.or
                  (i32.and (get_local $b) (get_local $c))
                  ;; ~a == a ^ 0xffffffff
                  (i32.and (i32.xor (get_local $b) (i32.const 0xffffffff)) (get_local $d))
                )
              )
              (set_local $k (i32.const 0x5a827999))
              (br 2) ;; $get_key
            )
          )
          (if (i32.lt_s (get_local $w) (i32.const 40))
            (block
              ;; f = b ^ c ^ d
              (set_local $f
                (i32.xor
                  (i32.xor (get_local $b) (get_local $c))
                  (get_local $d)
                )
              )
              (set_local $k (i32.const 0x6ed9eba1))
              (br 2) ;; $get_key
            )
          )
          (if (i32.lt_s (get_local $w) (i32.const 60))
            (block
              ;; f = (b & c) | (b & d) | (c & d)
              (set_local $f
                (i32.or
                  (i32.or
                    (i32.and (get_local $b) (get_local $c))
                    (i32.and (get_local $b) (get_local $d))
                  )
                  (i32.and (get_local $c) (get_local $d))
                )
              )
              (set_local $k (i32.const 0x8f1bbcdc))
              (br 2) ;; $get_key
            )
          )
          (if (i32.lt_s (get_local $w) (i32.const 80))
            (block
              ;; f = b ^ c ^ d
              (set_local $f
                (i32.xor
                  (i32.xor (get_local $b) (get_local $c))
                  (get_local $d)
                )
              )
              (set_local $k (i32.const 0xca62c1d6))
              (br 2) ;; $get_key
            )
          )
        )

        ;; t = a rotl 5 + f + e + k + words[w]
        (set_local $t
          (i32.add
            (i32.add
              (i32.add
                (i32.rotl (get_local $a) (i32.const 5))
                (get_local $f)
              )
              (i32.add
                (get_local $e)
                (get_local $k)
              )
            )
            (call $get_word (get_local $w))
          )
        )

        ;; rotate variables
        (set_local $e (get_local $d))
        (set_local $d (get_local $c))
        (set_local $c (i32.rotl (get_local $b) (i32.const 30)))
        (set_local $b (get_local $a))
        (set_local $a (get_local $t))

        ;; w += 1
        (set_local $w (i32.add (get_local $w) (i32.const 1)))

        ;; if 80 <= w, break
        (br_if 1 (i32.ge_s (get_local $w) (i32.const 80))) ;; 1 := $done

        ;; else, continue
        (br 0) ;; $loop
      )
    )

    ;; feed to h0 ~ h4
    (set_global $h0 (i32.add (get_local $a) (get_global $h0)))
    (set_global $h1 (i32.add (get_local $b) (get_global $h1)))
    (set_global $h2 (i32.add (get_local $c) (get_global $h2)))
    (set_global $h3 (i32.add (get_local $d) (get_global $h3)))
    (set_global $h4 (i32.add (get_local $e) (get_global $h4)))
  )

  ;; function `sha1_end`
  ;; input  - length of final chunk
  (func $sha1_end (param $final_len i32)
    (local $total_len i32)
    (local $i i32)

    ;; total_len = message_len + final_len
    (set_local $total_len (i32.add
      (get_global $message_len)
      (get_local $final_len)
    ))

    ;; append 0x80
    (i32.store8 (get_local $final_len) (i32.const 0x80))

    (set_local $i (i32.add (get_local $final_len) (i32.const 1)))

    (if (i32.gt_s (get_local $i) (i32.const 56))
      ;; if 56 < i
      (block
        (block $done_pad
          ;; zero pad
          (loop $loop
            (br_if 1 (i32.ge_s (get_local $i) (i32.const 64))) ;; 1 := $done_pad

            (i32.store8 (get_local $i) (i32.const 0))
            (set_local $i (i32.add (get_local $i) (i32.const 1)))
            (br 0) ;; $loop
          )
        )

        ;; update
        (call $sha1_update)

        ;; fill 14 words with 0
        (i64.store (i32.const 0x00) (i64.const 0))
        (i64.store (i32.const 0x08) (i64.const 0))
        (i64.store (i32.const 0x10) (i64.const 0))
        (i64.store (i32.const 0x18) (i64.const 0))
        (i64.store (i32.const 0x20) (i64.const 0))
        (i64.store (i32.const 0x28) (i64.const 0))
        (i64.store (i32.const 0x30) (i64.const 0))
      )

      ;; else
      (block $done_pad
        ;; zero pad
        (loop $loop
          (br_if 1 (i32.ge_s (get_local $i) (i32.const 56))) ;; 1 := $done_pad

          (i32.store8 (get_local $i) (i32.const 0))
          (set_local $i (i32.add (get_local $i) (i32.const 1)))
          (br 0) ;; $loop
        )
      )
    )

    ;; append length (in bits)
    (call $set_word (i32.const 14) (i32.const 0))
    (call $set_word (i32.const 15) (i32.mul (get_local $total_len) (i32.const 8)))

    ;; update final block
    (call $sha1_update)

    ;; copy h0~4 to memory
    (i32.store (i32.const 0x40) (get_global $h0))
    (i32.store (i32.const 0x44) (get_global $h1))
    (i32.store (i32.const 0x48) (get_global $h2))
    (i32.store (i32.const 0x4c) (get_global $h3))
    (i32.store (i32.const 0x50) (get_global $h4))
  )

  (func $increase_counter
    ;; $offset must be absolute in memory
    (param $offset i32)
    (param $length i32)

    ;; The new length
    (result i32)

    (local $index i32)
    (local $character i32)
    (set_local $index (i32.add (get_local $offset) (get_local $length)))


    (loop $main_loop
        ;; Decrease variable
        (set_local $index (i32.sub (get_local $index) (i32.const 1)))

        (if
            ;; Test if we're over the number bound
            (i32.lt_u (get_local $index) (get_local $offset))

            (block
                ;; Increase the index by one again to set the first character to 1
                (i32.store8 (i32.add (get_local $index) (i32.const 1)) (i32.const 49))

                (i32.store8 (i32.add (get_local $offset) (get_local $length)) (i32.const 48))
                (set_local $length (i32.add (get_local $length) (i32.const 1)))

                (return (get_local $length))
            )
        )

        (set_local $character (i32.load8_u (get_local $index)))

        (if
            ;; $character == '9'
            (i32.eq (get_local $character) (i32.const 57))

            (block
                ;; Set it to '0' and decrease $index
                (i32.store8 (get_local $index) (i32.const 48))

                (br 2) ;; 2 := $main_loop
            )
        )

        ;; Increase by one
        (i32.store8 (get_local $index) (i32.add (get_local $character) (i32.const 1)))
    )

    (return (get_local $length))
  )


  (func $mine ;; depth := 0
    ;; Length of the base 64 string
    (param $length64 i32)
    ;; Length of the counter
    (param $length_counter i32)
    ;; Iterations to do
    (param $iterations i32)
    ;; The current best level we want to overreach
    (param $target_level i32)

    ;; Returns the best found level
    (result i32)

    (local $level i32)
    (local $best_level i32)

    (local $write_offset i32)
    (local $write_index i32)
    (local $max_write_index i32)

    (set_local $best_level (get_local $target_level))

    (block $done ;; depth := 1
        (loop $main_loop  ;; depth := 2
            call $sha1_init

            ;; Load the first 64 bytes
            (i64.store (i32.const 0x00) (i64.load (i32.const 0x0A0)))
            (i64.store (i32.const 0x08) (i64.load (i32.const 0x0A8)))
            (i64.store (i32.const 0x10) (i64.load (i32.const 0x0B0)))
            (i64.store (i32.const 0x18) (i64.load (i32.const 0x0B8)))
            (i64.store (i32.const 0x20) (i64.load (i32.const 0x0C0)))
            (i64.store (i32.const 0x28) (i64.load (i32.const 0x0C8)))
            (i64.store (i32.const 0x30) (i64.load (i32.const 0x0D0)))
            (i64.store (i32.const 0x38) (i64.load (i32.const 0x0D8)))
            call $sha1_update

            (set_local $max_write_index (i32.add (i32.add (get_local $length64) (get_local $length_counter)) (i32.const 0x0A0)))
            (set_local $write_index (i32.const 0x0E0))
            (set_local $write_offset (i32.const 0))

            (loop $write_loop ;; depth := 3
                (i32.store8 (get_local $write_offset) (i32.load8_u (get_local $write_index)))

                (set_local $write_offset (i32.add (get_local $write_offset) (i32.const 1)))
                (if (i32.eq (get_local $write_offset) (i32.const 64))
                    (block
                        (call $sha1_update)
                        (set_local $write_offset (i32.const 0))
                    )
                )

                (set_local $write_index (i32.add (get_local $write_index) (i32.const 1)))
                (br_if 0 (i32.lt_s (get_local $write_index) (get_local $max_write_index))) ;; 0 := $write_loop
            )
            (call $sha1_end (get_local $write_offset))

            ;; Count for each block the tailing zero bits. If the bits are 32 then add the next block
            (set_local $level (i32.ctz (call $flip_endian (get_global $h0)))) ;; First block [0;32[
            (if
                (i32.eq (get_local $level) (i32.const 32))

                (block
                    (set_local $level
                        (i32.add (i32.ctz (call $flip_endian (get_global $h1))) (get_local $level)) ;; Second block [32;64[
                    )

                    (if
                        (i32.eq (get_local $level) (i32.const 64))

                        (block
                            (set_local $level
                                (i32.add (i32.ctz (call $flip_endian (get_global $h2))) (get_local $level)) ;; Third block [64;86[
                            )

                            (if
                                (i32.eq (get_local $level) (i32.const 84))

                                (block
                                    (set_local $level
                                        (i32.add (i32.ctz (call $flip_endian (get_global $h3))) (get_local $level)) ;; Fourth block [86;128[
                                    )

                                    (if
                                        (i32.eq (get_local $level) (i32.const 128))

                                        (block
                                            (set_local $level
                                                (i32.add (i32.ctz (call $flip_endian (get_global $h4))) (get_local $level)) ;; Fifth block [128;160[
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )

            (if (i32.lt_u (get_local $best_level) (get_local $level))
                (block
                    (set_local $best_level (get_local $level))

                    ;; If we have a target level then break here
                    (if
                        (i32.ne (get_local $target_level) (i32.const 0))
                        (br 4) ;; $done maybe 4?
                    )
                )
            )

            ;; Increase everything
            (set_local $iterations (i32.sub (get_local $iterations) (i32.const 1)))
            (set_local $length_counter
                (call $increase_counter (i32.add (i32.const 0x0A0) (get_local $length64)) (get_local $length_counter))
            )

            (br_if 0 (i32.gt_u (get_local $iterations) (i32.const 0))) ;; 0 := $main_loop
        )
    )

    ;; May length had changed, so we null terminate it
    (i64.store (i32.add (i32.const 0x0A0) (i32.add (get_local $length64) (get_local $length_counter))) (i64.const 0x0))
    (return (get_local $best_level))
  )
)
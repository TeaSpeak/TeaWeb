/* IMPOTZ COMMENT */
import * as module_a from "./module_a";

/* CLASS COMMENT!*/
export class C extends module_a.TestClass {}

/* Say a comment */
export const say_a = module_a.say_hello_a;

/* Say b comment */
export function say_b() {
    console.log("B!");
    module_a.say_hello_a();
}
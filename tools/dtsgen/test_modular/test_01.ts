import * as module_a from "./module_a";

export class C extends module_a.TestClass {}

export const say_a = module_a.say_hello_a;
export function say_b() {
    console.log("B!");
    module_a.say_hello_a();
}
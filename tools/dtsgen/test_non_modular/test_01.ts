function test() : string {

    return "IDK!";
}

class C {

}
function test2() : C {

    return undefined;
}
// @ts-ignore
function test4() : D {

    return undefined;
}

namespace T {
    function C() {

    }
    export function D() {

    }
}

namespace T {
    namespace Y {
        function T() {}

        export function Y() {}
    }
}

namespace T {
    export async function async_void() {}
    export async function async_any() : Promise<any> {
        return "" as any;
    }
    export async function async_number() : Promise<number> {
        return 0;
    }
    export async function async_number_string() : Promise<number | string> {
        return 0;
    }
}
function test() : string {

    return "IDK!";
}

class C {

}
function test2() : C {

    return undefined;
}
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
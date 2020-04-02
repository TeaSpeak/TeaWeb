/* get <name>() is not allowed within decl files. So declare the variable instead */

class A {
    get x() { return "X"; }
    set x(value: string) {}
}
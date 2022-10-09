export class Identifier<T> {
    private _value: T;

    get value(): T {
        return this._value;
    }

    constructor(value: T) {
        this._value = value;
    }

    isEqual(id?: Identifier<T>): boolean {
        if (id === null || id === undefined) {
            return false;
        }

        if (!(id instanceof this.constructor)) {
            return false;
        }

        return id.value === this._value;
    }

    toString(): string {
        return String(this._value);
    }
}

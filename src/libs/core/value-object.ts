import { isEqual } from 'lodash';

interface ValueObjectProps {
    [index: string]: any;
}

export abstract class ValueObject<T extends ValueObjectProps> {
    public readonly props: Readonly<T>;

    constructor(props: T) {
        this.props = Object.freeze(props);
    }

    isEqual(vo?: ValueObject<T>): boolean {
        if (vo === null || vo === undefined) {
            return false;
        }
        if (vo.props === undefined) {
            return false;
        }

        return isEqual(this.props, vo.props);
    }
}

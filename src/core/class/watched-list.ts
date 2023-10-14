export abstract class WatchedList<T> {
    private _initial: T[];
    private _current: T[];
    private _new: T[];
    private _removed: T[];

    protected constructor(initialItems?: T[]) {
        this._initial = [...initialItems] ?? [];
        this._current = [...initialItems] ?? [];
        this._new = [];
        this._removed = [];
    }

    public abstract compareItems(a: T, b: T): boolean;
    protected abstract _validateWhenCreating(item: T): void;
    protected abstract _validateWhenAdding(item: T): void;
    protected abstract _validateWhenRemoving(item: T): void;

    public getItems(): T[] {
        return this._current;
    }

    public getItemByFn(fn: (value: T, index: number, obj: T[]) => boolean): T {
        return this._current.find(fn);
    }

    public getNewItems(): T[] {
        return this._new;
    }

    public getRemoveItems(): T[] {
        return this._removed;
    }

    public exists(item: T): boolean {
        return this._isCurrentItem(item);
    }

    public isEmpty(): boolean {
        return this._current.length === 0;
    }

    public add(item: T): void {
        this._validateWhenAdding(item);

        if (this._isRemovedItem(item)) {
            this._removeFromRemoved(item);
        }

        if (!this._isNewItem(item) && !this._wasAddedInitially(item)) {
            this._new.push(item);
        }

        if (!this._isCurrentItem(item)) {
            this._current.push(item);
        }
    }

    public remove(item: T): void {
        this._validateWhenRemoving(item);

        this._removeFromCurrent(item);

        if (this._isNewItem(item)) {
            this._removeFromNew(item);
            return;
        }

        if (!this._isRemovedItem(item)) {
            this._removed.push(item);
            return;
        }
    }

    public replace(item: T): void {
        if (this.exists(item)) {
            this.remove(item);
        }

        this.add(item);
    }

    public clear(): void {
        this.getItems().forEach((item) => {
            this.remove(item);
        });
    }

    private _isCurrentItem(item: T): boolean {
        return this._current.some((v) => this.compareItems(item, v));
    }

    private _isNewItem(item: T): boolean {
        return this._new.some((v) => this.compareItems(item, v));
    }

    private _isRemovedItem(item: T): boolean {
        return this._removed.some((v) => this.compareItems(item, v));
    }

    private _removeFromNew(item: T): void {
        this._new = this._new.filter((v) => !this.compareItems(item, v));
    }

    private _removeFromCurrent(item: T): void {
        this._current = this._current.filter(
            (v) => !this.compareItems(item, v),
        );
    }

    private _removeFromRemoved(item: T): void {
        this._removed = this._removed.filter(
            (v) => !this.compareItems(item, v),
        );
    }

    private _wasAddedInitially(item: T): boolean {
        return this._initial.some((v) => this.compareItems(item, v));
    }
}

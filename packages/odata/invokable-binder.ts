import { IQueryable } from "./queryable.js";
import { IRequestContext } from "./pipeline.js";
import { IFetchOptions, ILibraryConfiguration, DefaultRuntime } from "@pnp/common";
import { extensionOrDefault, applyFactoryExtensions } from "./invokable-extensions.js";

export type IHybrid<R = any, T = any> = T & {
    (this: T, ...args: any[]): Promise<R>;
};

export type IInvoker<R> = (this: IQueryable<any>, ...args: any[]) => Promise<R>;

const invokableBinder = (invoker: IInvoker<IQueryable<any>>) => <R>(constructor: { new(...args: any[]): any }): (...args: any[]) => R & IInvokable => {

    return (...args: any[]) => {

        const factory = (as: any[]) => {
            const r = Object.assign(function (...ags: any[]) {
                return invoker.call(r, ...ags);
            }, new constructor(...as));
            Reflect.setPrototypeOf(r, constructor.prototype);
            return r;
        };

        // ie11 setting is always global
        if (DefaultRuntime.get<ILibraryConfiguration, boolean>("ie11") || false) {

            return factory(args);
        } else {

            return new Proxy<IHybrid<R>>(applyFactoryExtensions(factory, args), {
                apply: (target: any, _thisArg: any, argArray?: any) => {
                    return extensionOrDefault("apply", (...a: any[]) => Reflect.apply(a[0], a[1], a[2]), target, _thisArg, argArray);
                },
                get: (target: any, p: PropertyKey, receiver: any) => {
                    return extensionOrDefault("get", (...a: any[]) => Reflect.get(a[0], a[1], a[2]), target, p, receiver);
                },
                has: (target: any, p: PropertyKey) => {
                    return extensionOrDefault("has", (...a: any[]) => Reflect.has(a[0], a[1]), target, p);
                },
                set: (target: any, p: PropertyKey, value: any, receiver: any) => {
                    return extensionOrDefault("set", (...a: any[]) => Reflect.set(a[0], a[1], a[2], a[3]), target, p, value, receiver);
                },
            });
        }
    };
};

export const invokableFactory = invokableBinder(function <R = any>(this: IQueryable<R>, options?: IFetchOptions): Promise<R> {
    return this.defaultAction(options);
});

export interface IInvokable<R = any> {
    <T = R>(options?: Partial<IRequestContext<T>>): Promise<T>;
}

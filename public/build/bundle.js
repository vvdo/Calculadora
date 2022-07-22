
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __classPrivateFieldGet(receiver, state, kind, f) {
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    }

    function __classPrivateFieldSet(receiver, state, value, kind, f) {
        if (kind === "m") throw new TypeError("Private method is not writable");
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
    }

    var _CalculadoraModel_valor, _CalculadoraModel_acumulador, _CalculadoraModel_limparTela, _CalculadoraModel_operacao;
    const NAO_LIMPAR_TELA = false;
    const LIMPAR_TELA = true;
    class CalculadoraModel {
        constructor(valor = null, acumulador = null, operacao = null, limparTela = false) {
            _CalculadoraModel_valor.set(this, void 0);
            _CalculadoraModel_acumulador.set(this, void 0);
            _CalculadoraModel_limparTela.set(this, void 0);
            _CalculadoraModel_operacao.set(this, void 0);
            __classPrivateFieldSet(this, _CalculadoraModel_valor, valor, "f");
            __classPrivateFieldSet(this, _CalculadoraModel_acumulador, acumulador, "f");
            __classPrivateFieldSet(this, _CalculadoraModel_limparTela, limparTela, "f");
            __classPrivateFieldSet(this, _CalculadoraModel_operacao, operacao, "f");
        }
        get valor() {
            var _a;
            return ((_a = __classPrivateFieldGet(this, _CalculadoraModel_valor, "f")) === null || _a === void 0 ? void 0 : _a.replace('.', ',')) || '0';
        }
        numeroDigitado(novoValor) {
            return new CalculadoraModel((__classPrivateFieldGet(this, _CalculadoraModel_limparTela, "f") || !__classPrivateFieldGet(this, _CalculadoraModel_valor, "f")) ? novoValor : __classPrivateFieldGet(this, _CalculadoraModel_valor, "f") + novoValor, __classPrivateFieldGet(this, _CalculadoraModel_acumulador, "f"), __classPrivateFieldGet(this, _CalculadoraModel_operacao, "f"), NAO_LIMPAR_TELA);
        }
        pontoDigitado() {
            var _a;
            return new CalculadoraModel(((_a = __classPrivateFieldGet(this, _CalculadoraModel_valor, "f")) === null || _a === void 0 ? void 0 : _a.includes('.')) ? __classPrivateFieldGet(this, _CalculadoraModel_valor, "f") : this.valor + '.', __classPrivateFieldGet(this, _CalculadoraModel_acumulador, "f"), __classPrivateFieldGet(this, _CalculadoraModel_operacao, "f"), NAO_LIMPAR_TELA);
        }
        limpar() {
            return new CalculadoraModel();
        }
        operacaoDigitada(proximaOperacao) {
            return this.calcular(proximaOperacao);
        }
        calcular(proximaOperacao = null) {
            const acumulador = !__classPrivateFieldGet(this, _CalculadoraModel_operacao, "f")
                ? parseFloat(__classPrivateFieldGet(this, _CalculadoraModel_valor, "f"))
                : eval(`${__classPrivateFieldGet(this, _CalculadoraModel_acumulador, "f")} ${__classPrivateFieldGet(this, _CalculadoraModel_operacao, "f")} ${__classPrivateFieldGet(this, _CalculadoraModel_valor, "f")}`);
            const valor = !__classPrivateFieldGet(this, _CalculadoraModel_operacao, "f") ? __classPrivateFieldGet(this, _CalculadoraModel_valor, "f") : `${acumulador}`;
            return new CalculadoraModel(valor, acumulador, proximaOperacao, proximaOperacao ? LIMPAR_TELA : NAO_LIMPAR_TELA);
        }
    }
    _CalculadoraModel_valor = new WeakMap(), _CalculadoraModel_acumulador = new WeakMap(), _CalculadoraModel_limparTela = new WeakMap(), _CalculadoraModel_operacao = new WeakMap();

    /* src\components\Botao.svelte generated by Svelte v3.49.0 */

    const file$4 = "src\\components\\Botao.svelte";

    function create_fragment$4(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*texto*/ ctx[0]);
    			attr_dev(button, "class", "botao svelte-3san3g");
    			toggle_class(button, "triplo", /*triplo*/ ctx[1]);
    			toggle_class(button, "duplo", /*duplo*/ ctx[2]);
    			toggle_class(button, "operacao", /*operacao*/ ctx[3]);
    			toggle_class(button, "destaque", /*destaque*/ ctx[4]);
    			add_location(button, file$4, 8, 0, 201);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*texto*/ 1) set_data_dev(t, /*texto*/ ctx[0]);

    			if (dirty & /*triplo*/ 2) {
    				toggle_class(button, "triplo", /*triplo*/ ctx[1]);
    			}

    			if (dirty & /*duplo*/ 4) {
    				toggle_class(button, "duplo", /*duplo*/ ctx[2]);
    			}

    			if (dirty & /*operacao*/ 8) {
    				toggle_class(button, "operacao", /*operacao*/ ctx[3]);
    			}

    			if (dirty & /*destaque*/ 16) {
    				toggle_class(button, "destaque", /*destaque*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Botao', slots, []);
    	let { texto } = $$props;
    	let { triplo = false } = $$props;
    	let { duplo = false } = $$props;
    	let { operacao = false } = $$props;
    	let { destaque = false } = $$props;

    	let { onClick = () => {
    		
    	} } = $$props;

    	const writable_props = ['texto', 'triplo', 'duplo', 'operacao', 'destaque', 'onClick'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Botao> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => onClick(texto);

    	$$self.$$set = $$props => {
    		if ('texto' in $$props) $$invalidate(0, texto = $$props.texto);
    		if ('triplo' in $$props) $$invalidate(1, triplo = $$props.triplo);
    		if ('duplo' in $$props) $$invalidate(2, duplo = $$props.duplo);
    		if ('operacao' in $$props) $$invalidate(3, operacao = $$props.operacao);
    		if ('destaque' in $$props) $$invalidate(4, destaque = $$props.destaque);
    		if ('onClick' in $$props) $$invalidate(5, onClick = $$props.onClick);
    	};

    	$$self.$capture_state = () => ({
    		texto,
    		triplo,
    		duplo,
    		operacao,
    		destaque,
    		onClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('texto' in $$props) $$invalidate(0, texto = $$props.texto);
    		if ('triplo' in $$props) $$invalidate(1, triplo = $$props.triplo);
    		if ('duplo' in $$props) $$invalidate(2, duplo = $$props.duplo);
    		if ('operacao' in $$props) $$invalidate(3, operacao = $$props.operacao);
    		if ('destaque' in $$props) $$invalidate(4, destaque = $$props.destaque);
    		if ('onClick' in $$props) $$invalidate(5, onClick = $$props.onClick);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [texto, triplo, duplo, operacao, destaque, onClick, click_handler];
    }

    class Botao extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			texto: 0,
    			triplo: 1,
    			duplo: 2,
    			operacao: 3,
    			destaque: 4,
    			onClick: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Botao",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*texto*/ ctx[0] === undefined && !('texto' in props)) {
    			console.warn("<Botao> was created without expected prop 'texto'");
    		}
    	}

    	get texto() {
    		throw new Error("<Botao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set texto(value) {
    		throw new Error("<Botao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get triplo() {
    		throw new Error("<Botao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set triplo(value) {
    		throw new Error("<Botao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get duplo() {
    		throw new Error("<Botao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set duplo(value) {
    		throw new Error("<Botao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get operacao() {
    		throw new Error("<Botao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set operacao(value) {
    		throw new Error("<Botao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get destaque() {
    		throw new Error("<Botao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set destaque(value) {
    		throw new Error("<Botao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onClick() {
    		throw new Error("<Botao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onClick(value) {
    		throw new Error("<Botao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Linha.svelte generated by Svelte v3.49.0 */

    const file$3 = "src\\components\\Linha.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "linha svelte-two2f1");
    			add_location(div, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Linha', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Linha> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Linha extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Linha",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\Tela.svelte generated by Svelte v3.49.0 */

    const file$2 = "src\\components\\Tela.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let span;
    	let t;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t = text(/*valor*/ ctx[0]);
    			add_location(span, file$2, 4, 4, 162);
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(`tela ${/*tamanhoFonte*/ ctx[1]}`) + " svelte-wb0yvp"));
    			add_location(div, file$2, 3, 0, 120);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*valor*/ 1) set_data_dev(t, /*valor*/ ctx[0]);

    			if (dirty & /*tamanhoFonte*/ 2 && div_class_value !== (div_class_value = "" + (null_to_empty(`tela ${/*tamanhoFonte*/ ctx[1]}`) + " svelte-wb0yvp"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let tamanhoFonte;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tela', slots, []);
    	let { valor } = $$props;
    	const writable_props = ['valor'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tela> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('valor' in $$props) $$invalidate(0, valor = $$props.valor);
    	};

    	$$self.$capture_state = () => ({ valor, tamanhoFonte });

    	$$self.$inject_state = $$props => {
    		if ('valor' in $$props) $$invalidate(0, valor = $$props.valor);
    		if ('tamanhoFonte' in $$props) $$invalidate(1, tamanhoFonte = $$props.tamanhoFonte);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*valor*/ 1) {
    			$$invalidate(1, tamanhoFonte = valor.length > 20 ? 'pequena' : `s-${valor.length}`);
    		}
    	};

    	return [valor, tamanhoFonte];
    }

    class Tela extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { valor: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tela",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*valor*/ ctx[0] === undefined && !('valor' in props)) {
    			console.warn("<Tela> was created without expected prop 'valor'");
    		}
    	}

    	get valor() {
    		throw new Error("<Tela>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valor(value) {
    		throw new Error("<Tela>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Calculadora.svelte generated by Svelte v3.49.0 */
    const file$1 = "src\\components\\Calculadora.svelte";

    // (14:4) <Linha>
    function create_default_slot_4(ctx) {
    	let botao0;
    	let t;
    	let botao1;
    	let current;

    	botao0 = new Botao({
    			props: {
    				destaque: true,
    				triplo: true,
    				texto: "AC",
    				onClick: /*limpar*/ ctx[5]
    			},
    			$$inline: true
    		});

    	botao1 = new Botao({
    			props: {
    				operacao: true,
    				texto: "/",
    				onClick: /*operacaoDigitada*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(botao0.$$.fragment);
    			t = space();
    			create_component(botao1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(botao0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(botao1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(botao0.$$.fragment, local);
    			transition_in(botao1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(botao0.$$.fragment, local);
    			transition_out(botao1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(botao0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(botao1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(14:4) <Linha>",
    		ctx
    	});

    	return block;
    }

    // (18:4) <Linha>
    function create_default_slot_3(ctx) {
    	let botao0;
    	let t0;
    	let botao1;
    	let t1;
    	let botao2;
    	let t2;
    	let botao3;
    	let current;

    	botao0 = new Botao({
    			props: {
    				texto: "7",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao1 = new Botao({
    			props: {
    				texto: "8",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao2 = new Botao({
    			props: {
    				texto: "9",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao3 = new Botao({
    			props: {
    				operacao: true,
    				texto: "*",
    				onClick: /*operacaoDigitada*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(botao0.$$.fragment);
    			t0 = space();
    			create_component(botao1.$$.fragment);
    			t1 = space();
    			create_component(botao2.$$.fragment);
    			t2 = space();
    			create_component(botao3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(botao0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(botao1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(botao2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(botao3, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(botao0.$$.fragment, local);
    			transition_in(botao1.$$.fragment, local);
    			transition_in(botao2.$$.fragment, local);
    			transition_in(botao3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(botao0.$$.fragment, local);
    			transition_out(botao1.$$.fragment, local);
    			transition_out(botao2.$$.fragment, local);
    			transition_out(botao3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(botao0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(botao1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(botao2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(botao3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(18:4) <Linha>",
    		ctx
    	});

    	return block;
    }

    // (24:4) <Linha>
    function create_default_slot_2(ctx) {
    	let botao0;
    	let t0;
    	let botao1;
    	let t1;
    	let botao2;
    	let t2;
    	let botao3;
    	let current;

    	botao0 = new Botao({
    			props: {
    				texto: "4",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao1 = new Botao({
    			props: {
    				texto: "5",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao2 = new Botao({
    			props: {
    				texto: "6",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao3 = new Botao({
    			props: {
    				operacao: true,
    				texto: "+",
    				onClick: /*operacaoDigitada*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(botao0.$$.fragment);
    			t0 = space();
    			create_component(botao1.$$.fragment);
    			t1 = space();
    			create_component(botao2.$$.fragment);
    			t2 = space();
    			create_component(botao3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(botao0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(botao1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(botao2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(botao3, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(botao0.$$.fragment, local);
    			transition_in(botao1.$$.fragment, local);
    			transition_in(botao2.$$.fragment, local);
    			transition_in(botao3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(botao0.$$.fragment, local);
    			transition_out(botao1.$$.fragment, local);
    			transition_out(botao2.$$.fragment, local);
    			transition_out(botao3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(botao0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(botao1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(botao2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(botao3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(24:4) <Linha>",
    		ctx
    	});

    	return block;
    }

    // (30:4) <Linha>
    function create_default_slot_1(ctx) {
    	let botao0;
    	let t0;
    	let botao1;
    	let t1;
    	let botao2;
    	let t2;
    	let botao3;
    	let current;

    	botao0 = new Botao({
    			props: {
    				texto: "1",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao1 = new Botao({
    			props: {
    				texto: "2",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao2 = new Botao({
    			props: {
    				texto: "3",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao3 = new Botao({
    			props: {
    				operacao: true,
    				texto: "-",
    				onClick: /*operacaoDigitada*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(botao0.$$.fragment);
    			t0 = space();
    			create_component(botao1.$$.fragment);
    			t1 = space();
    			create_component(botao2.$$.fragment);
    			t2 = space();
    			create_component(botao3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(botao0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(botao1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(botao2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(botao3, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(botao0.$$.fragment, local);
    			transition_in(botao1.$$.fragment, local);
    			transition_in(botao2.$$.fragment, local);
    			transition_in(botao3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(botao0.$$.fragment, local);
    			transition_out(botao1.$$.fragment, local);
    			transition_out(botao2.$$.fragment, local);
    			transition_out(botao3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(botao0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(botao1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(botao2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(botao3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(30:4) <Linha>",
    		ctx
    	});

    	return block;
    }

    // (36:4) <Linha>
    function create_default_slot(ctx) {
    	let botao0;
    	let t0;
    	let botao1;
    	let t1;
    	let botao2;
    	let current;

    	botao0 = new Botao({
    			props: {
    				duplo: true,
    				texto: "0",
    				onClick: /*numeroDigitado*/ ctx[1]
    			},
    			$$inline: true
    		});

    	botao1 = new Botao({
    			props: {
    				texto: ",",
    				onClick: /*pntoDigitado*/ ctx[4]
    			},
    			$$inline: true
    		});

    	botao2 = new Botao({
    			props: {
    				destaque: true,
    				texto: "=",
    				onClick: /*calcular*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(botao0.$$.fragment);
    			t0 = space();
    			create_component(botao1.$$.fragment);
    			t1 = space();
    			create_component(botao2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(botao0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(botao1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(botao2, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(botao0.$$.fragment, local);
    			transition_in(botao1.$$.fragment, local);
    			transition_in(botao2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(botao0.$$.fragment, local);
    			transition_out(botao1.$$.fragment, local);
    			transition_out(botao2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(botao0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(botao1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(botao2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(36:4) <Linha>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let tela;
    	let t0;
    	let linha0;
    	let t1;
    	let linha1;
    	let t2;
    	let linha2;
    	let t3;
    	let linha3;
    	let t4;
    	let linha4;
    	let current;

    	tela = new Tela({
    			props: { valor: /*calc*/ ctx[0].valor },
    			$$inline: true
    		});

    	linha0 = new Linha({
    			props: {
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	linha1 = new Linha({
    			props: {
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	linha2 = new Linha({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	linha3 = new Linha({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	linha4 = new Linha({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(tela.$$.fragment);
    			t0 = space();
    			create_component(linha0.$$.fragment);
    			t1 = space();
    			create_component(linha1.$$.fragment);
    			t2 = space();
    			create_component(linha2.$$.fragment);
    			t3 = space();
    			create_component(linha3.$$.fragment);
    			t4 = space();
    			create_component(linha4.$$.fragment);
    			attr_dev(div, "class", "calculadora svelte-1nu2epx");
    			add_location(div, file$1, 11, 0, 516);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(tela, div, null);
    			append_dev(div, t0);
    			mount_component(linha0, div, null);
    			append_dev(div, t1);
    			mount_component(linha1, div, null);
    			append_dev(div, t2);
    			mount_component(linha2, div, null);
    			append_dev(div, t3);
    			mount_component(linha3, div, null);
    			append_dev(div, t4);
    			mount_component(linha4, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tela_changes = {};
    			if (dirty & /*calc*/ 1) tela_changes.valor = /*calc*/ ctx[0].valor;
    			tela.$set(tela_changes);
    			const linha0_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				linha0_changes.$$scope = { dirty, ctx };
    			}

    			linha0.$set(linha0_changes);
    			const linha1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				linha1_changes.$$scope = { dirty, ctx };
    			}

    			linha1.$set(linha1_changes);
    			const linha2_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				linha2_changes.$$scope = { dirty, ctx };
    			}

    			linha2.$set(linha2_changes);
    			const linha3_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				linha3_changes.$$scope = { dirty, ctx };
    			}

    			linha3.$set(linha3_changes);
    			const linha4_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				linha4_changes.$$scope = { dirty, ctx };
    			}

    			linha4.$set(linha4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tela.$$.fragment, local);
    			transition_in(linha0.$$.fragment, local);
    			transition_in(linha1.$$.fragment, local);
    			transition_in(linha2.$$.fragment, local);
    			transition_in(linha3.$$.fragment, local);
    			transition_in(linha4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tela.$$.fragment, local);
    			transition_out(linha0.$$.fragment, local);
    			transition_out(linha1.$$.fragment, local);
    			transition_out(linha2.$$.fragment, local);
    			transition_out(linha3.$$.fragment, local);
    			transition_out(linha4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(tela);
    			destroy_component(linha0);
    			destroy_component(linha1);
    			destroy_component(linha2);
    			destroy_component(linha3);
    			destroy_component(linha4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Calculadora', slots, []);
    	let calc = new CalculadoraModel();
    	const numeroDigitado = num => $$invalidate(0, calc = calc.numeroDigitado(num));
    	const operacaoDigitada = op => $$invalidate(0, calc = calc.operacaoDigitada(op));
    	const calcular = () => $$invalidate(0, calc = calc.calcular());
    	const pntoDigitado = () => $$invalidate(0, calc = calc.pontoDigitado());
    	const limpar = () => $$invalidate(0, calc = calc.limpar());
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Calculadora> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		CalculadoraModel,
    		Botao,
    		Linha,
    		Tela,
    		calc,
    		numeroDigitado,
    		operacaoDigitada,
    		calcular,
    		pntoDigitado,
    		limpar
    	});

    	$$self.$inject_state = $$props => {
    		if ('calc' in $$props) $$invalidate(0, calc = $$props.calc);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [calc, numeroDigitado, operacaoDigitada, calcular, pntoDigitado, limpar];
    }

    class Calculadora extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Calculadora",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.49.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let calculadora;
    	let current;
    	calculadora = new Calculadora({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(calculadora.$$.fragment);
    			attr_dev(main, "class", "svelte-1sgn1bl");
    			add_location(main, file, 3, 0, 89);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(calculadora, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(calculadora.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(calculadora.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(calculadora);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Calculadora });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map

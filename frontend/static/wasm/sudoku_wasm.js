/* @ts-self-types="./sudoku_wasm.d.ts" */

/**
 * The main WASM game controller
 */
export class SudokuGame {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SudokuGameFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sudokugame_free(ptr, 0);
    }
    /**
     * Get current difficulty
     * @returns {string}
     */
    difficulty() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sudokugame_difficulty(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get elapsed time in seconds
     * @returns {number}
     */
    elapsed_secs() {
        const ret = wasm.sudokugame_elapsed_secs(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get formatted elapsed time
     * @returns {string}
     */
    elapsed_string() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sudokugame_elapsed_string(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get games played count
     * @returns {number}
     */
    games_played() {
        const ret = wasm.sudokugame_games_played(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get games won count
     * @returns {number}
     */
    games_won() {
        const ret = wasm.sudokugame_games_won(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Snapshot the logical candidates used by hints. Player pencil marks are
     * notes, so candidates are rebuilt from placed values before capture.
     * @returns {string}
     */
    get_arithmetic_state_json() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.sudokugame_get_arithmetic_state_json(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Export the shown arithmetic hint together with its exact assumptions.
     * Returns JSON null when the current hint uses a different technique.
     * @returns {string}
     */
    get_current_arithmetic_replay_json() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.sudokugame_get_current_arithmetic_replay_json(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Get current height
     * @returns {number}
     */
    get_height() {
        const ret = wasm.sudokugame_get_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the move log as JSON for anti-cheat replay
     * @returns {string}
     */
    get_move_log() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sudokugame_get_move_log(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get the current puzzle as an 81-character string
     * @returns {string}
     */
    get_puzzle_string() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sudokugame_get_puzzle_string(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get the short code for the current puzzle, or empty string if not available
     * @returns {string}
     */
    get_short_code() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sudokugame_get_short_code(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get current game state as JSON
     * @returns {string}
     */
    get_state_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sudokugame_get_state_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get player statistics as JSON for persistence
     * @returns {string}
     */
    get_stats_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sudokugame_get_stats_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get current width
     * @returns {number}
     */
    get_width() {
        const ret = wasm.sudokugame_get_width(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event
     * @returns {boolean}
     */
    handle_key(event) {
        const ret = wasm.sudokugame_handle_key(this.__wbg_ptr, event);
        return ret !== 0;
    }
    /**
     * Get number of hints used
     * @returns {number}
     */
    hints_used() {
        const ret = wasm.sudokugame_hints_used(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Check if game is complete
     * @returns {boolean}
     */
    is_complete() {
        const ret = wasm.sudokugame_is_complete(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if game is over (too many mistakes)
     * @returns {boolean}
     */
    is_game_over() {
        const ret = wasm.sudokugame_is_game_over(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if paused
     * @returns {boolean}
     */
    is_paused() {
        const ret = wasm.sudokugame_is_paused(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if secret difficulties (Master/Extreme) are unlocked
     * @returns {boolean}
     */
    is_secrets_unlocked() {
        const ret = wasm.sudokugame_is_secrets_unlocked(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Load a pre-generated puzzle from JSON, skipping solve/rating. Returns true on success.
     * JSON must contain: puzzle_string, solution_string, difficulty, se_rating
     * @param {string} json
     * @returns {boolean}
     */
    load_pregenerated(json) {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sudokugame_load_pregenerated(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Load a puzzle from an 81-character string, returns true on success
     * @param {string} puzzle
     * @returns {boolean}
     */
    load_puzzle_string(puzzle) {
        const ptr0 = passStringToWasm0(puzzle, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sudokugame_load_puzzle_string(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Load a puzzle from a short code (e.g., "M1A2B3C4"), returns true on success
     * @param {string} code
     * @returns {boolean}
     */
    load_short_code(code) {
        const ptr0 = passStringToWasm0(code, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sudokugame_load_short_code(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Load game state from JSON
     * @param {string} json
     * @returns {boolean}
     */
    load_state_json(json) {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sudokugame_load_state_json(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Load player statistics from JSON
     * @param {string} json
     * @returns {boolean}
     */
    load_stats_json(json) {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sudokugame_load_stats_json(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Get number of mistakes
     * @returns {number}
     */
    mistakes() {
        const ret = wasm.sudokugame_mistakes(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a new game attached to a canvas element
     * @param {string} canvas_id
     */
    constructor(canvas_id) {
        const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sudokugame_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        SudokuGameFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Start a new game with specified difficulty
     * @param {string} difficulty
     */
    new_game(difficulty) {
        const ptr0 = passStringToWasm0(difficulty, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.sudokugame_new_game(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Resize the game canvas
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        wasm.sudokugame_resize(this.__wbg_ptr, width, height);
    }
    /**
     * Get the current screen state (Playing, Paused, Win, Lose, Menu, Stats, Loading)
     * @returns {string}
     */
    screen_state() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sudokugame_screen_state(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get Sudoku Explainer (SE) numerical rating for the current puzzle
     * @returns {number}
     */
    se_rating() {
        const ret = wasm.sudokugame_se_rating(this.__wbg_ptr);
        return ret;
    }
    /**
     * Set secrets unlocked state (for persistence from JS)
     * @param {boolean} unlocked
     */
    set_secrets_unlocked(unlocked) {
        wasm.sudokugame_set_secrets_unlocked(this.__wbg_ptr, unlocked);
    }
    /**
     * Set the color theme
     * @param {string} theme_name
     */
    set_theme(theme_name) {
        const ptr0 = passStringToWasm0(theme_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.sudokugame_set_theme(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Take the pending new-game difficulty (if any). Returns the difficulty string
     * or empty string if no new game is pending.
     * The host should generate a puzzle for this difficulty and call load_pregenerated(),
     * or fall back to new_game() for synchronous generation.
     * @returns {string}
     */
    take_pending_difficulty() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sudokugame_take_pending_difficulty(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Update game state (call from requestAnimationFrame)
     */
    tick() {
        wasm.sudokugame_tick(this.__wbg_ptr);
    }
    /**
     * Toggle pause
     */
    toggle_pause() {
        wasm.sudokugame_toggle_pause(this.__wbg_ptr);
    }
}
if (Symbol.dispose) SudokuGame.prototype[Symbol.dispose] = SudokuGame.prototype.free;

/**
 * Generate a puzzle in the background (no canvas required).
 * Returns JSON: {puzzle_hash, puzzle_string, solution_string, difficulty, se_rating, short_code}
 * @param {string} difficulty
 * @returns {string}
 */
export function generate_puzzle_json(difficulty) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(difficulty, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.generate_puzzle_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

export function init() {
    wasm.init();
}

/**
 * Search the supplied exact candidate snapshot. An empty options string uses
 * the bounded defaults. A missing hint does not establish impossibility.
 * @param {string} state_json
 * @param {string} options_json
 * @returns {string}
 */
export function search_arithmetic_json(state_json, options_json) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(state_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(options_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.search_arithmetic_json(ptr0, len0, ptr1, len1);
        var ptr3 = ret[0];
        var len3 = ret[1];
        if (ret[3]) {
            ptr3 = 0; len3 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

/**
 * Independently replay a certificate against its included candidate snapshot.
 * Invalid JSON, unsupported versions, or changed evidence return false.
 * @param {string} replay_json
 * @returns {boolean}
 */
export function verify_arithmetic_replay_json(replay_json) {
    const ptr0 = passStringToWasm0(replay_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.verify_arithmetic_replay_json(ptr0, len0);
    return ret !== 0;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_is_function_fcda5e3902d732fe: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_object_edb6b15aa3afe12e: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_c4f7cb494a2a21f1: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_8c687d0b90d5b524: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_throw_5d9e815e6fdf150f: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_beginPath_ccad41b15817641f: function(arg0) {
            arg0.beginPath();
        },
        __wbg_call_6bcf8d3e20937e46: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_crypto_38df2bab126b63dc: function(arg0) {
            const ret = arg0.crypto;
            return ret;
        },
        __wbg_ctrlKey_785e802b8798af13: function(arg0) {
            const ret = arg0.ctrlKey;
            return ret;
        },
        __wbg_devicePixelRatio_da557bfb3b99fb02: function(arg0) {
            const ret = arg0.devicePixelRatio;
            return ret;
        },
        __wbg_document_c7f486c52d63d24e: function(arg0) {
            const ret = arg0.document;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_error_757e9472f8410341: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_fillRect_ff9957352a08db2c: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.fillRect(arg1, arg2, arg3, arg4);
        },
        __wbg_fillText_9b463cd65b9c1016: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.fillText(getStringFromWasm0(arg1, arg2), arg3, arg4);
        }, arguments); },
        __wbg_getContext_e0c05ffee530bdcf: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_getElementById_ccc92d66acf76819: function(arg0, arg1, arg2) {
            const ret = arg0.getElementById(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_getRandomValues_c44a50d8cfdaebeb: function() { return handleError(function (arg0, arg1) {
            arg0.getRandomValues(arg1);
        }, arguments); },
        __wbg_instanceof_CanvasRenderingContext2d_bde5245b14027f3f: function(arg0) {
            let result;
            try {
                result = arg0 instanceof CanvasRenderingContext2D;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_HtmlCanvasElement_4d7e131643d814c1: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLCanvasElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Window_a3b8566f0a9c5d1a: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_key_d29d670923b81510: function(arg0, arg1) {
            const ret = arg1.key;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_length_31bdaf014f5fbde2: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_lineTo_3256517fc9554e23: function(arg0, arg1, arg2) {
            arg0.lineTo(arg1, arg2);
        },
        __wbg_measureText_1733ac2408cd5f5e: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.measureText(getStringFromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_moveTo_2e2b57a16e7eda7b: function(arg0, arg1, arg2) {
            arg0.moveTo(arg1, arg2);
        },
        __wbg_msCrypto_bd5a034af96bcba6: function(arg0) {
            const ret = arg0.msCrypto;
            return ret;
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_new_with_length_5ffeddb9d9fbb96f: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return ret;
        },
        __wbg_node_84ea875411254db1: function(arg0) {
            const ret = arg0.node;
            return ret;
        },
        __wbg_now_0b7736bc17fd7719: function(arg0) {
            const ret = arg0.now();
            return ret;
        },
        __wbg_performance_d96ad0b441f4510a: function(arg0) {
            const ret = arg0.performance;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_process_44c7a14e11e9f69e: function(arg0) {
            const ret = arg0.process;
            return ret;
        },
        __wbg_prototypesetcall_ae9f5e7459250748: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_randomFillSync_6c25eac9869eb53c: function() { return handleError(function (arg0, arg1) {
            arg0.randomFillSync(arg1);
        }, arguments); },
        __wbg_require_b4edbdcf3e2a1ef0: function() { return handleError(function () {
            const ret = module.require;
            return ret;
        }, arguments); },
        __wbg_resetTransform_4647c0ecfc06bb0b: function() { return handleError(function (arg0) {
            arg0.resetTransform();
        }, arguments); },
        __wbg_scale_3309b08795192444: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.scale(arg1, arg2);
        }, arguments); },
        __wbg_setProperty_6139dd07828b5817: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.setProperty(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_set_fillStyle_59940a18480ccdf7: function(arg0, arg1, arg2) {
            arg0.fillStyle = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_font_50854c5bdd1ca607: function(arg0, arg1, arg2) {
            arg0.font = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_height_698fb3b255bc1348: function(arg0, arg1) {
            arg0.height = arg1 >>> 0;
        },
        __wbg_set_lineWidth_0b0f32c89c240172: function(arg0, arg1) {
            arg0.lineWidth = arg1;
        },
        __wbg_set_strokeStyle_2ce46a01ec1ff9ad: function(arg0, arg1, arg2) {
            arg0.strokeStyle = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_textAlign_b3d2e546635621d4: function(arg0, arg1, arg2) {
            arg0.textAlign = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_textBaseline_41538118f83d0399: function(arg0, arg1, arg2) {
            arg0.textBaseline = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_width_4c3a2252e0dea033: function(arg0, arg1) {
            arg0.width = arg1 >>> 0;
        },
        __wbg_shiftKey_2b651c3e5a9c07f5: function(arg0) {
            const ret = arg0.shiftKey;
            return ret;
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_8eb4cd83130a11a0: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_1e7044f654e934db: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_d8b50611246a6d92: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_fd0bc376bf0f8b42: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_strokeRect_a5ecc238952f1eb8: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.strokeRect(arg1, arg2, arg3, arg4);
        },
        __wbg_stroke_8a243e7601bb8549: function(arg0) {
            arg0.stroke();
        },
        __wbg_style_b79c69cee0c004b9: function(arg0) {
            const ret = arg0.style;
            return ret;
        },
        __wbg_subarray_1daff70dde20c145: function(arg0, arg1, arg2) {
            const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_versions_276b2795b1c6a219: function(arg0) {
            const ret = arg0.versions;
            return ret;
        },
        __wbg_width_b0c7f2ae9ce3ffb0: function(arg0) {
            const ret = arg0.width;
            return ret;
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./sudoku_wasm_bg.js": import0,
    };
}

const SudokuGameFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sudokugame_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('sudoku_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };

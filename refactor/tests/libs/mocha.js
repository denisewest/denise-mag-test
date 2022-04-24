(function () {
  // CommonJS require()

  function require(p) {
    const path = require.resolve(p),
       mod = require.modules[path];
    if (!mod) throw new Error(`failed to require "${  p  }"`);
    if (!mod.exports) {
      mod.exports = {};
      mod.call(mod.exports, mod, mod.exports, require.relative(path));
    }
    return mod.exports;
  }

  require.modules = {};

  require.resolve = function (path) {
    const orig = path,
       reg = `${path  }.js`,
       index = `${path  }/index.js`;
    return require.modules[reg] && reg
      || require.modules[index] && index
      || orig;
  };

  require.register = function (path, fn) {
    require.modules[path] = fn;
  };

  require.relative = function (parent) {
    return function (p) {
      if (p.charAt(0) != '.') return require(p);

      const path = parent.split('/'),
         segs = p.split('/');
      path.pop();

      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if (seg == '..') path.pop();
        else if (seg != '.') path.push(seg);
      }

      return require(path.join('/'));
    };
  };

  require.register('browser/debug.js', (module, exports, require) => {
    module.exports = function (type) {
      return function () {

      };
    };
  }); // module: browser/debug.js

  require.register('browser/diff.js', (module, exports, require) => {
    /* See license.txt for terms of usage */

    /*
 * Text diff implementation.
 *
 * This library supports the following APIS:
 * JsDiff.diffChars: Character by character diff
 * JsDiff.diffWords: Word (as defined by \b regex) diff which ignores whitespace
 * JsDiff.diffLines: Line based diff
 *
 * JsDiff.diffCss: Diff targeted at CSS content
 *
 * These methods are based on the implementation proposed in
 * "An O(ND) Difference Algorithm and its Variations" (Myers, 1986).
 * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
 */
    const JsDiff = (function () {
      function clonePath(path) {
        return { newPos: path.newPos, components: path.components.slice(0) };
      }

      function removeEmpty(array) {
        let ret = [];
        for (let i = 0; i < array.length; i++) {
          if (array[i]) {
            ret.push(array[i]);
          }
        }
        return ret;
      }

      function escapeHTML(s) {
        let n = s;
        n = n.replace(/&/g, '&amp;');
        n = n.replace(/</g, '&lt;');
        n = n.replace(/>/g, '&gt;');
        n = n.replace(/"/g, '&quot;');

        return n;
      }

      let fbDiff = function (ignoreWhitespace) {
        this.ignoreWhitespace = ignoreWhitespace;
      };
      fbDiff.prototype = {
        diff(oldString, newString) {
          // Handle the identity case (this is due to unrolling editLength == 0
          if (newString == oldString) {
            return [{ value: newString }];
          }
          if (!newString) {
            return [{ value: oldString, removed: true }];
          }
          if (!oldString) {
            return [{ value: newString, added: true }];
          }

          newString = this.tokenize(newString);
          oldString = this.tokenize(oldString);

          var newLen = newString.length, oldLen = oldString.length;
          var maxEditLength = newLen + oldLen;
          var bestPath = [{ newPos: -1, components: [] }];

          // Seed editLength = 0
          var oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);
          if (bestPath[0].newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
            return bestPath[0].components;
          }

          for (var editLength = 1; editLength <= maxEditLength; editLength++) {
            for (var diagonalPath = -1 * editLength; diagonalPath <= editLength; diagonalPath += 2) {
              var basePath;
              var addPath = bestPath[diagonalPath - 1],
                removePath = bestPath[diagonalPath + 1];
              oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;
              if (addPath) {
                // No one else is going to attempt to use this value, clear it
                bestPath[diagonalPath - 1] = undefined;
              }

              var canAdd = addPath && addPath.newPos + 1 < newLen;
              var canRemove = removePath && 0 <= oldPos && oldPos < oldLen;
              if (!canAdd && !canRemove) {
                bestPath[diagonalPath] = undefined;
                continue;
              }

              // Select the diagonal that we want to branch from. We select the prior
              // path whose position in the new string is the farthest from the origin
              // and does not pass the bounds of the diff graph
              if (!canAdd || (canRemove && addPath.newPos < removePath.newPos)) {
                basePath = clonePath(removePath);
                this.pushComponent(basePath.components, oldString[oldPos], undefined, true);
              } else {
                basePath = clonePath(addPath);
                basePath.newPos++;
                this.pushComponent(basePath.components, newString[basePath.newPos], true, undefined);
              }

              var oldPos = this.extractCommon(basePath, newString, oldString, diagonalPath);

              if (basePath.newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
                return basePath.components;
              } else {
                bestPath[diagonalPath] = basePath;
              }
            }
          }
        },

        pushComponent(components, value, added, removed) {
          var last = components[components.length - 1];
          if (last && last.added === added && last.removed === removed) {
            // We need to clone here as the component clone operation is just
            // as shallow array clone
            components[components.length - 1] =
              { value: this.join(last.value, value), added: added, removed: removed };
          } else {
            components.push({ value: value, added: added, removed: removed });
          }
        },
        extractCommon(basePath, newString, oldString, diagonalPath) {
          var newLen = newString.length,
            oldLen = oldString.length,
            newPos = basePath.newPos,
            oldPos = newPos - diagonalPath;
          while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1])) {
            newPos++;
            oldPos++;

            this.pushComponent(basePath.components, newString[newPos], undefined, undefined);
          }
          basePath.newPos = newPos;
          return oldPos;
        },

        equals(left, right) {
          var reWhitespace = /\S/;
          if (this.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right)) {
            return true;
          } else {
            return left == right;
          }
        },
        join(left, right) {
          return left + right;
        },
        tokenize(value) {
          return value;
        }
      };

      let CharDiff = new fbDiff();

      let WordDiff = new fbDiff(true);
      WordDiff.tokenize = function (value) {
        return removeEmpty(value.split(/(\s+|\b)/));
      };

      let CssDiff = new fbDiff(true);
      CssDiff.tokenize = function (value) {
        return removeEmpty(value.split(/([{}:;,]|\s+)/));
      };

      let LineDiff = new fbDiff();
      LineDiff.tokenize = function (value) {
        return value.split(/^/m);
      };

      return {
        diffChars(oldStr, newStr) {
          return CharDiff.diff(oldStr, newStr);
        },
        diffWords(oldStr, newStr) {
          return WordDiff.diff(oldStr, newStr);
        },
        diffLines(oldStr, newStr) {
          return LineDiff.diff(oldStr, newStr);
        },

        diffCss(oldStr, newStr) {
          return CssDiff.diff(oldStr, newStr);
        },

        createPatch(fileName, oldStr, newStr, oldHeader, newHeader) {
          var ret = [];

          ret.push("Index: " + fileName);
          ret.push("===================================================================");
          ret.push("--- " + fileName + (typeof oldHeader === "undefined" ? "" : "\t" + oldHeader));
          ret.push("+++ " + fileName + (typeof newHeader === "undefined" ? "" : "\t" + newHeader));

          var diff = LineDiff.diff(oldStr, newStr);
          if (!diff[diff.length - 1].value) {
            diff.pop();   // Remove trailing newline add
          }
          diff.push({ value: "", lines: [] });   // Append an empty value to make cleanup easier

          function contextLines(lines) {
            return lines.map(function(entry) {
              return " " + entry;
            });
          }

          function eofNL(curRange, i, current) {
            var last = diff[diff.length - 2],
              isLast = i === diff.length - 2,
              isLastOfType = i === diff.length - 3 && (current.added === !last.added || current.removed === !last.removed);

            // Figure out if this is the last line for the given file and missing NL
            if (!/\n$/.test(current.value) && (isLast || isLastOfType)) {
              curRange.push("\\ No newline at end of file");
            }
          }

          var oldRangeStart = 0, newRangeStart = 0, curRange = [],
            oldLine = 1, newLine = 1;
          for (var i = 0; i < diff.length; i++) {
            var current = diff[i],
              lines = current.lines || current.value.replace(/\n$/, "").split("\n");
            current.lines = lines;

            if (current.added || current.removed) {
              if (!oldRangeStart) {
                var prev = diff[i - 1];
                oldRangeStart = oldLine;
                newRangeStart = newLine;

                if (prev) {
                  curRange = contextLines(prev.lines.slice(-4));
                  oldRangeStart -= curRange.length;
                  newRangeStart -= curRange.length;
                }
              }
              curRange.push.apply(curRange, lines.map(function(entry) {
                return (current.added ? "+" : "-") + entry;
              }));
              eofNL(curRange, i, current);

              if (current.added) {
                newLine += lines.length;
              } else {
                oldLine += lines.length;
              }
            } else {
              if (oldRangeStart) {
                // Close out any changes that have been output (or join overlapping)
                if (lines.length <= 8 && i < diff.length - 2) {
                  // Overlapping
                  curRange.push.apply(curRange, contextLines(lines));
                } else {
                  // end the range and output
                  var contextSize = Math.min(lines.length, 4);
                  ret.push(
                    "@@ -" + oldRangeStart + "," + (oldLine - oldRangeStart + contextSize)
                    + " +" + newRangeStart + "," + (newLine - newRangeStart + contextSize)
                    + " @@");
                  ret.push.apply(ret, curRange);
                  ret.push.apply(ret, contextLines(lines.slice(0, contextSize)));
                  if (lines.length <= 4) {
                    eofNL(ret, i, current);
                  }

                  oldRangeStart = 0;
                  newRangeStart = 0;
                  curRange = [];
                }
              }
              oldLine += lines.length;
              newLine += lines.length;
            }
          }

          return ret.join("\n") + "\n";
        },

        convertChangesToXML(changes) {
          var ret = [];
          for (var i = 0; i < changes.length; i++) {
            var change = changes[i];
            if (change.added) {
              ret.push("<ins>");
            } else if (change.removed) {
              ret.push("<del>");
            }

            ret.push(escapeHTML(change.value));

            if (change.added) {
              ret.push("</ins>");
            } else if (change.removed) {
              ret.push("</del>");
            }
          }
          return ret.join("");
        }
      };
    }());

    if (typeof module !== 'undefined') {
      module.exports = JsDiff;
    }
  }); // module: browser/diff.js

  require.register('browser/events.js', (module, exports, require) => {
    /**
     * Module exports.
     */

    exports.EventEmitter = EventEmitter;

    /**
     * Check if `obj` is an array.
     */

    function isArray(obj) {
      return {}.toString.call(obj) == '[object Array]';
    }

    /**
     * Event emitter constructor.
     *
     * @api public
     */

    function EventEmitter() {
    }

    /**
     * Adds a listener.
     *
     * @api public
     */

    EventEmitter.prototype.on = function (name, fn) {
      if (!this.$events) {
        this.$events = {};
      }

      if (!this.$events[name]) {
        this.$events[name] = fn;
      } else if (isArray(this.$events[name])) {
        this.$events[name].push(fn);
      } else {
        this.$events[name] = [this.$events[name], fn];
      }

      return this;
    };

    EventEmitter.prototype.addListener = EventEmitter.prototype.on;

    /**
     * Adds a volatile listener.
     *
     * @api public
     */

    EventEmitter.prototype.once = function (name, fn) {
      const self = this;

      function on() {
        self.removeListener(name, on);
        fn.apply(this, arguments);
      }

      on.listener = fn;
      this.on(name, on);

      return this;
    };

    /**
     * Removes a listener.
     *
     * @api public
     */

    EventEmitter.prototype.removeListener = function (name, fn) {
      if (this.$events && this.$events[name]) {
        const list = this.$events[name];

        if (isArray(list)) {
          let pos = -1;

          for (let i = 0, l = list.length; i < l; i++) {
            if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
              pos = i;
              break;
            }
          }

          if (pos < 0) {
            return this;
          }

          list.splice(pos, 1);

          if (!list.length) {
            delete this.$events[name];
          }
        } else if (list === fn || (list.listener && list.listener === fn)) {
          delete this.$events[name];
        }
      }

      return this;
    };

    /**
     * Removes all listeners for an event.
     *
     * @api public
     */

    EventEmitter.prototype.removeAllListeners = function (name) {
      if (name === undefined) {
        this.$events = {};
        return this;
      }

      if (this.$events && this.$events[name]) {
        this.$events[name] = null;
      }

      return this;
    };

    /**
     * Gets all listeners for a certain event.
     *
     * @api public
     */

    EventEmitter.prototype.listeners = function (name) {
      if (!this.$events) {
        this.$events = {};
      }

      if (!this.$events[name]) {
        this.$events[name] = [];
      }

      if (!isArray(this.$events[name])) {
        this.$events[name] = [this.$events[name]];
      }

      return this.$events[name];
    };

    /**
     * Emits an event.
     *
     * @api public
     */

    EventEmitter.prototype.emit = function (name) {
      if (!this.$events) {
        return false;
      }

      const handler = this.$events[name];

      if (!handler) {
        return false;
      }

      const args = [].slice.call(arguments, 1);

      if (typeof handler === 'function') {
        handler.apply(this, args);
      } else if (isArray(handler)) {
        const listeners = handler.slice();

        for (let i = 0, l = listeners.length; i < l; i++) {
          listeners[i].apply(this, args);
        }
      } else {
        return false;
      }

      return true;
    };
  }); // module: browser/events.js

  require.register('browser/fs.js', (module, exports, require) => {

  }); // module: browser/fs.js

  require.register('browser/path.js', (module, exports, require) => {

  }); // module: browser/path.js

  require.register('browser/progress.js', (module, exports, require) => {
    /**
     * Expose `Progress`.
     */

    module.exports = Progress;

    /**
     * Initialize a new `Progress` indicator.
     */

    function Progress() {
      this.percent = 0;
      this.size(0);
      this.fontSize(11);
      this.font('helvetica, arial, sans-serif');
    }

    /**
     * Set progress size to `n`.
     *
     * @param {Number} n
     * @return {Progress} for chaining
     * @api public
     */

    Progress.prototype.size = function (n) {
      this._size = n;
      return this;
    };

    /**
     * Set text to `str`.
     *
     * @param {String} str
     * @return {Progress} for chaining
     * @api public
     */

    Progress.prototype.text = function (str) {
      this._text = str;
      return this;
    };

    /**
     * Set font size to `n`.
     *
     * @param {Number} n
     * @return {Progress} for chaining
     * @api public
     */

    Progress.prototype.fontSize = function (n) {
      this._fontSize = n;
      return this;
    };

    /**
     * Set font `family`.
     *
     * @param {String} family
     * @return {Progress} for chaining
     */

    Progress.prototype.font = function (family) {
      this._font = family;
      return this;
    };

    /**
     * Update percentage to `n`.
     *
     * @param {Number} n
     * @return {Progress} for chaining
     */

    Progress.prototype.update = function (n) {
      this.percent = n;
      return this;
    };

    /**
     * Draw on `ctx`.
     *
     * @param {CanvasRenderingContext2d} ctx
     * @return {Progress} for chaining
     */

    Progress.prototype.draw = function (ctx) {
      const percent = Math.min(this.percent, 100),
         size = this._size,
         half = size / 2,
         x = half,
         y = half,
         rad = half - 1,
         fontSize = this._fontSize;

      ctx.font = `${fontSize }px ${ this._font}`;

      const angle = Math.PI * 2 * (percent / 100);
      ctx.clearRect(0, 0, size, size);

      // outer circle
      ctx.strokeStyle = '#9f9f9f';
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, angle, false);
      ctx.stroke();

      // inner circle
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.arc(x, y, rad - 1, 0, angle, true);
      ctx.stroke();

      // text
      const text = this._text || `${percent | 0  }%`,
         w = ctx.measureText(text).width;

      ctx.fillText(
        text,
        x - w / 2 + 1,
        y + fontSize / 2 - 1,
);

      return this;
    };
  }); // module: browser/progress.js

  require.register('browser/tty.js', (module, exports, require) => {
    exports.isatty = function () {
      return true;
    };

    exports.getWindowSize = function () {
      return [window.innerHeight, window.innerWidth];
    };
  }); // module: browser/tty.js

  require.register('context.js', (module, exports, require) => {
    /**
     * Expose `Context`.
     */

    module.exports = Context;

    /**
     * Initialize a new `Context`.
     *
     * @api private
     */

    function Context() {
    }

    /**
     * Set or get the context `Runnable` to `runnable`.
     *
     * @param {Runnable} runnable
     * @return {Context}
     * @api private
     */

    Context.prototype.runnable = function (runnable) {
      if (arguments.length == 0) return this._runnable;
      this.test = this._runnable = runnable;
      return this;
    };

    /**
     * Set test timeout `ms`.
     *
     * @param {Number} ms
     * @return {Context} self
     * @api private
     */

    Context.prototype.timeout = function (ms) {
      this.runnable().timeout(ms);
      return this;
    };

    /**
     * Set test slowness threshold `ms`.
     *
     * @param {Number} ms
     * @return {Context} self
     * @api private
     */

    Context.prototype.slow = function (ms) {
      this.runnable().slow(ms);
      return this;
    };

    /**
     * Inspect the context void of `._runnable`.
     *
     * @return {String}
     * @api private
     */

    Context.prototype.inspect = function () {
      return JSON.stringify(this, (key, val) => {
        if (key == '_runnable') return;
        if (key == 'test') return;
        return val;
      }, 2);
    };
  }); // module: context.js

  require.register('hook.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Runnable = require('./runnable');

    /**
     * Expose `Hook`.
     */

    module.exports = Hook;

    /**
     * Initialize a new `Hook` with the given `title` and callback `fn`.
     *
     * @param {String} title
     * @param {Function} fn
     * @api private
     */

    function Hook(title, fn) {
      Runnable.call(this, title, fn);
      this.type = 'hook';
    }

    /**
     * Inherit from `Runnable.prototype`.
     */

    function F() {
    }
    F.prototype = Runnable.prototype;
    Hook.prototype = new F();
    Hook.prototype.constructor = Hook;

    /**
     * Get or set the test `err`.
     *
     * @param {Error} err
     * @return {Error}
     * @api public
     */

    Hook.prototype.error = function (err) {
      if (arguments.length == 0) {
        var err = this._error;
        this._error = null;
        return err;
      }

      this._error = err;
    };
  }); // module: hook.js

  require.register('interfaces/bdd.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Suite = require('../suite'),
       Test = require('../test');

    /**
     * BDD-style interface:
     *
     *      describe('Array', function(){
     *        describe("#indexOf()", function(){
     *          it('should return -1 when not present', function(){
     *
     *          });
     *
     *          it('should return the index when present', function(){
     *
     *          });
     *        });
     *      });
     *
     */

    module.exports = function (suite) {
      const suites = [suite];

      suite.on('pre-require', (context, file, mocha) => {
        /**
         * Execute before running tests.
         */

        context.before = function (fn) {
          suites[0].beforeAll(fn);
        };

        /**
         * Execute after running tests.
         */

        context.after = function (fn) {
          suites[0].afterAll(fn);
        };

        /**
         * Execute before each test case.
         */

        context.beforeEach = function (fn) {
          suites[0].beforeEach(fn);
        };

        /**
         * Execute after each test case.
         */

        context.afterEach = function (fn) {
          suites[0].afterEach(fn);
        };

        /**
         * Describe a "suite" with the given `title`
         * and callback `fn` containing nested suites
         * and/or tests.
         */

        context.describe = context.context = function (title, fn) {
          const suite = Suite.create(suites[0], title);
          suites.unshift(suite);
          fn.call(suite);
          suites.shift();
          return suite;
        };

        /**
         * Pending describe.
         */

        context.xdescribe = context.xcontext = context.describe.skip = function (title, fn) {
          let suite = Suite.create(suites[0], title);
          suite.pending = true;
          suites.unshift(suite);
          fn.call(suite);
          suites.shift();
        };

        /**
         * Exclusive suite.
         */

        context.describe.only = function (title, fn) {
          const suite = context.describe(title, fn);
          mocha.grep(suite.fullTitle());
        };

        /**
         * Describe a specification or test-case
         * with the given `title` and callback `fn`
         * acting as a thunk.
         */

        context.it = context.specify = function (title, fn) {
          const suite = suites[0];
          if (suite.pending) var fn = null;
          const test = new Test(title, fn);
          suite.addTest(test);
          return test;
        };

        /**
         * Exclusive test-case.
         */

        context.it.only = function (title, fn) {
          const test = context.it(title, fn);
          mocha.grep(test.fullTitle());
        };

        /**
         * Pending test case.
         */

        context.xit = context.xspecify = context.it.skip = function (title) {
          context.it(title);
        };
      });
    };
  }); // module: interfaces/bdd.js

  require.register('interfaces/exports.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Suite = require('../suite'),
       Test = require('../test');

    /**
     * TDD-style interface:
     *
     *     exports.Array = {
     *       '#indexOf()': {
     *         'should return -1 when the value is not present': function(){
     *
     *         },
     *
     *         'should return the correct index when the value is present': function(){
     *
     *         }
     *       }
     *     };
     *
     */

    module.exports = function (suite) {
      const suites = [suite];

      suite.on('require', visit);

      function visit(obj) {
        var suite;
        for (const key in obj) {
          if (typeof obj[key] === 'function') {
            const fn = obj[key];
            switch (key) {
              case 'before':
                suites[0].beforeAll(fn);
                break;
              case 'after':
                suites[0].afterAll(fn);
                break;
              case 'beforeEach':
                suites[0].beforeEach(fn);
                break;
              case 'afterEach':
                suites[0].afterEach(fn);
                break;
              default:
                suites[0].addTest(new Test(key, fn));
            }
          } else {
            var suite = Suite.create(suites[0], key);
            suites.unshift(suite);
            visit(obj[key]);
            suites.shift();
          }
        }
      }
    };
  }); // module: interfaces/exports.js

  require.register('interfaces/index.js', (module, exports, require) => {
    exports.bdd = require('./bdd');
    exports.tdd = require('./tdd');
    exports.qunit = require('./qunit');
    exports.exports = require('./exports');
  }); // module: interfaces/index.js

  require.register('interfaces/qunit.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Suite = require('../suite'),
       Test = require('../test');

    /**
     * QUnit-style interface:
     *
     *     suite('Array');
     *
     *     test('#length', function(){
     *       var arr = [1,2,3];
     *       ok(arr.length == 3);
     *     });
     *
     *     test('#indexOf()', function(){
     *       var arr = [1,2,3];
     *       ok(arr.indexOf(1) == 0);
     *       ok(arr.indexOf(2) == 1);
     *       ok(arr.indexOf(3) == 2);
     *     });
     *
     *     suite('String');
     *
     *     test('#length', function(){
     *       ok('foo'.length == 3);
     *     });
     *
     */

    module.exports = function (suite) {
      const suites = [suite];

      suite.on('pre-require', (context) => {
        /**
         * Execute before running tests.
         */

        context.before = function (fn) {
          suites[0].beforeAll(fn);
        };

        /**
         * Execute after running tests.
         */

        context.after = function (fn) {
          suites[0].afterAll(fn);
        };

        /**
         * Execute before each test case.
         */

        context.beforeEach = function (fn) {
          suites[0].beforeEach(fn);
        };

        /**
         * Execute after each test case.
         */

        context.afterEach = function (fn) {
          suites[0].afterEach(fn);
        };

        /**
         * Describe a "suite" with the given `title`.
         */

        context.suite = function (title) {
          if (suites.length > 1) suites.shift();
          const suite = Suite.create(suites[0], title);
          suites.unshift(suite);
        };

        /**
         * Describe a specification or test-case
         * with the given `title` and callback `fn`
         * acting as a thunk.
         */

        context.test = function (title, fn) {
          suites[0].addTest(new Test(title, fn));
        };
      });
    };
  }); // module: interfaces/qunit.js

  require.register('interfaces/tdd.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Suite = require('../suite'),
       Test = require('../test');

    /**
     * TDD-style interface:
     *
     *      suite('Array', function(){
     *        suite("#indexOf()", function(){
     *          suiteSetup(function(){
     *
     *          });
     *
     *          test('should return -1 when not present', function(){
     *
     *          });
     *
     *          test('should return the index when present', function(){
     *
     *          });
     *
     *          suiteTeardown(function(){
     *
     *          });
     *        });
     *      });
     *
     */

    module.exports = function (suite) {
      const suites = [suite];

      suite.on('pre-require', (context, file, mocha) => {
        /**
         * Execute before each test case.
         */

        context.setup = function (fn) {
          suites[0].beforeEach(fn);
        };

        /**
         * Execute after each test case.
         */

        context.teardown = function (fn) {
          suites[0].afterEach(fn);
        };

        /**
         * Execute before the suite.
         */

        context.suiteSetup = function (fn) {
          suites[0].beforeAll(fn);
        };

        /**
         * Execute after the suite.
         */

        context.suiteTeardown = function (fn) {
          suites[0].afterAll(fn);
        };

        /**
         * Describe a "suite" with the given `title`
         * and callback `fn` containing nested suites
         * and/or tests.
         */

        context.suite = function (title, fn) {
          const suite = Suite.create(suites[0], title);
          suites.unshift(suite);
          fn.call(suite);
          suites.shift();
          return suite;
        };

        /**
         * Exclusive test-case.
         */

        context.suite.only = function (title, fn) {
          const suite = context.suite(title, fn);
          mocha.grep(suite.fullTitle());
        };

        /**
         * Describe a specification or test-case
         * with the given `title` and callback `fn`
         * acting as a thunk.
         */

        context.test = function (title, fn) {
          const test = new Test(title, fn);
          suites[0].addTest(test);
          return test;
        };

        /**
         * Exclusive test-case.
         */

        context.test.only = function (title, fn) {
          const test = context.test(title, fn);
          mocha.grep(test.fullTitle());
        };

        /**
         * Pending test case.
         */

        context.test.skip = function (title) {
          context.test(title);
        };
      });
    };
  }); // module: interfaces/tdd.js

  require.register('mocha.js', (module, exports, require) => {
    /*!
 * mocha
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

    /**
     * Module dependencies.
     */

    const path = require('browser/path'),
       utils = require('./utils');

    /**
     * Expose `Mocha`.
     */

    exports = module.exports = Mocha;

    /**
     * Expose internals.
     */

    exports.utils = utils;
    exports.interfaces = require('./interfaces');
    exports.reporters = require('./reporters');
    exports.Runnable = require('./runnable');
    exports.Context = require('./context');
    exports.Runner = require('./runner');
    exports.Suite = require('./suite');
    exports.Hook = require('./hook');
    exports.Test = require('./test');

    /**
     * Return image `name` path.
     *
     * @param {String} name
     * @return {String}
     * @api private
     */

    function image(name) {
      return `${__dirname }/../images/${ name }.png`;
    }

    /**
     * Setup mocha with `options`.
     *
     * Options:
     *
     *   - `ui` name "bdd", "tdd", "exports" etc
     *   - `reporter` reporter instance, defaults to `mocha.reporters.Dot`
     *   - `globals` array of accepted globals
     *   - `timeout` timeout in milliseconds
     *   - `bail` bail on the first test failure
     *   - `slow` milliseconds to wait before considering a test slow
     *   - `ignoreLeaks` ignore global leaks
     *   - `grep` string or regexp to filter tests with
     *
     * @param {Object} options
     * @api public
     */

    function Mocha(options) {
      options = options || {};
      this.files = [];
      this.options = options;
      this.grep(options.grep);
      this.suite = new exports.Suite('', new exports.Context());
      this.ui(options.ui);
      this.bail(options.bail);
      this.reporter(options.reporter);
      if (options.timeout) this.timeout(options.timeout);
      if (options.slow) this.slow(options.slow);
    }

    /**
     * Enable or disable bailing on the first failure.
     *
     * @param {Boolean} [bail]
     * @api public
     */

    Mocha.prototype.bail = function (bail) {
      if (bail == null) bail = true;
      this.suite.bail(bail);
      return this;
    };

    /**
     * Add test `file`.
     *
     * @param {String} file
     * @api public
     */

    Mocha.prototype.addFile = function (file) {
      this.files.push(file);
      return this;
    };

    /**
     * Set reporter to `reporter`, defaults to "dot".
     *
     * @param {String|Function} reporter name or constructor
     * @api public
     */

    Mocha.prototype.reporter = function (reporter) {
      if (typeof reporter === 'function') {
        this._reporter = reporter;
      } else {
        reporter = reporter || 'dot';
        try {
          this._reporter = require(`./reporters/${  reporter}`);
        } catch (err) {
          this._reporter = require(reporter);
        }
        if (!this._reporter) throw new Error(`invalid reporter "${  reporter  }"`);
      }
      return this;
    };

    /**
     * Set test UI `name`, defaults to "bdd".
     *
     * @param {String} bdd
     * @api public
     */

    Mocha.prototype.ui = function (name) {
      name = name || 'bdd';
      this._ui = exports.interfaces[name];
      if (!this._ui) throw new Error(`invalid interface "${  name  }"`);
      this._ui = this._ui(this.suite);
      return this;
    };

    /**
     * Load registered files.
     *
     * @api private
     */

    Mocha.prototype.loadFiles = function (fn) {
      const self = this;
      const {suite} = this;
      let pending = this.files.length;
      this.files.forEach((file) => {
        file = path.resolve(file);
        suite.emit('pre-require', global, file, self);
        suite.emit('require', require(file), file, self);
        suite.emit('post-require', global, file, self);
        --pending || (fn && fn());
      });
    };

    /**
     * Enable growl support.
     *
     * @api private
     */

    Mocha.prototype._growl = function (runner, reporter) {
      const notify = require('growl');

      runner.on('end', () => {
        const {stats} = reporter;
        if (stats.failures) {
          const msg = `${stats.failures  } of ${  runner.total  } tests failed`;
          notify(msg, { name: 'mocha', title: 'Failed', image: image('error') });
        } else {
          notify(`${stats.passes } tests passed in ${ stats.duration }ms`, {
            name: 'mocha',
            title: 'Passed',
            image: image('ok'),
          });
        }
      });
    };

    /**
     * Add regexp to grep, if `re` is a string it is escaped.
     *
     * @param {RegExp|String} re
     * @return {Mocha}
     * @api public
     */

    Mocha.prototype.grep = function (re) {
      this.options.grep = typeof re === 'string'
        ? new RegExp(utils.escapeRegexp(re))
        : re;
      return this;
    };

    /**
     * Invert `.grep()` matches.
     *
     * @return {Mocha}
     * @api public
     */

    Mocha.prototype.invert = function () {
      this.options.invert = true;
      return this;
    };

    /**
     * Ignore global leaks.
     *
     * @return {Mocha}
     * @api public
     */

    Mocha.prototype.ignoreLeaks = function () {
      this.options.ignoreLeaks = true;
      return this;
    };

    /**
     * Enable global leak checking.
     *
     * @return {Mocha}
     * @api public
     */

    Mocha.prototype.checkLeaks = function () {
      this.options.ignoreLeaks = false;
      return this;
    };

    /**
     * Enable growl support.
     *
     * @return {Mocha}
     * @api public
     */

    Mocha.prototype.growl = function () {
      this.options.growl = true;
      return this;
    };

    /**
     * Ignore `globals` array or string.
     *
     * @param {Array|String} globals
     * @return {Mocha}
     * @api public
     */

    Mocha.prototype.globals = function (globals) {
      this.options.globals = (this.options.globals || []).concat(globals);
      return this;
    };

    /**
     * Set the timeout in milliseconds.
     *
     * @param {Number} timeout
     * @return {Mocha}
     * @api public
     */

    Mocha.prototype.timeout = function (timeout) {
      this.suite.timeout(timeout);
      return this;
    };

    /**
     * Set slowness threshold in milliseconds.
     *
     * @param {Number} slow
     * @return {Mocha}
     * @api public
     */

    Mocha.prototype.slow = function (slow) {
      this.suite.slow(slow);
      return this;
    };

    /**
     * Makes all tests async (accepting a callback)
     *
     * @return {Mocha}
     * @api public
     */

    Mocha.prototype.asyncOnly = function () {
      this.options.asyncOnly = true;
      return this;
    };

    /**
     * Run tests and invoke `fn()` when complete.
     *
     * @param {Function} fn
     * @return {Runner}
     * @api public
     */

    Mocha.prototype.run = function (fn) {
      if (this.files.length) this.loadFiles();
      const {suite} = this;
      const {options} = this;
      const runner = new exports.Runner(suite);
      const reporter = new this._reporter(runner);
      runner.ignoreLeaks = options.ignoreLeaks;
      runner.asyncOnly = options.asyncOnly;
      if (options.grep) runner.grep(options.grep, options.invert);
      if (options.globals) runner.globals(options.globals);
      if (options.growl) this._growl(runner, reporter);
      return runner.run(fn);
    };
  }); // module: mocha.js

  require.register('ms.js', (module, exports, require) => {
    /**
     * Helpers.
     */

    const s = 1000;
    const m = s * 60;
    const h = m * 60;
    const d = h * 24;

    /**
     * Parse or format the given `val`.
     *
     * @param {String|Number} val
     * @return {String|Number}
     * @api public
     */

    module.exports = function (val) {
      if (typeof val === 'string') return parse(val);
      return format(val);
    };

    /**
     * Parse the given `str` and return milliseconds.
     *
     * @param {String} str
     * @return {Number}
     * @api private
     */

    function parse(str) {
      const m = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(str);
      if (!m) return;
      const n = parseFloat(m[1]);
      const type = (m[2] || 'ms').toLowerCase();
      switch (type) {
        case 'years':
        case 'year':
        case 'y':
          return n * 31557600000;
        case 'days':
        case 'day':
        case 'd':
          return n * 86400000;
        case 'hours':
        case 'hour':
        case 'h':
          return n * 3600000;
        case 'minutes':
        case 'minute':
        case 'm':
          return n * 60000;
        case 'seconds':
        case 'second':
        case 's':
          return n * 1000;
        case 'ms':
          return n;
      }
    }

    /**
     * Format the given `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api public
     */

    function format(ms) {
      if (ms == d) return `${Math.round(ms / d) } day`;
      if (ms > d) return `${Math.round(ms / d) } days`;
      if (ms == h) return `${Math.round(ms / h) } hour`;
      if (ms > h) return `${Math.round(ms / h) } hours`;
      if (ms == m) return `${Math.round(ms / m) } minute`;
      if (ms > m) return `${Math.round(ms / m) } minutes`;
      if (ms == s) return `${Math.round(ms / s) } second`;
      if (ms > s) return `${Math.round(ms / s) } seconds`;
      return `${ms } ms`;
    }
  }); // module: ms.js

  require.register('reporters/base.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const tty = require('browser/tty'),
       diff = require('browser/diff'),
       ms = require('../ms');

    /**
     * Save timer references to avoid Sinon interfering (see GH-237).
     */

    let { Date } = global;
       let {setTimeout} = global;
       let {setInterval} = global;
       let {clearTimeout} = global;
       let { clearInterval } = global;

    /**
     * Check if both stdio streams are associated with a tty.
     */

    const isatty = tty.isatty(1) && tty.isatty(2);

    /**
     * Expose `Base`.
     */

    exports = module.exports = Base;

    /**
     * Enable coloring by default.
     */

    exports.useColors = isatty;

    /**
     * Default color map.
     */

    exports.colors = {
      pass: 90,
      fail: 31,
      'bright pass': 92,
      'bright fail': 91,
      'bright yellow': 93,
      pending: 36,
      suite: 0,
      'error title': 0,
      'error message': 31,
      'error stack': 90,
      checkmark: 32,
      fast: 90,
      medium: 33,
      slow: 31,
      green: 32,
      light: 90,
      'diff gutter': 90,
      'diff added': 42,
      'diff removed': 41,
    };

    /**
     * Default symbol map.
     */

    exports.symbols = {
      ok: '✓',
      err: '✖',
      dot: '․',
    };

    // With node.js on Windows: use symbols available in terminal default fonts
    if (process.platform == 'win32') {
      exports.symbols.ok = '\u221A';
      exports.symbols.err = '\u00D7';
      exports.symbols.dot = '.';
    }

    /**
     * Color `str` with the given `type`,
     * allowing colors to be disabled,
     * as well as user-defined color
     * schemes.
     *
     * @param {String} type
     * @param {String} str
     * @return {String}
     * @api private
     */

    const color = exports.color = function (type, str) {
      if (!exports.useColors) return str;
      return '\u001b[' + exports.colors[type] + 'm' + str + '\u001b[0m';
    };

    /**
     * Expose term window size, with some
     * defaults for when stderr is not a tty.
     */

    exports.window = {
      width: isatty
        ? process.stdout.getWindowSize
          ? process.stdout.getWindowSize(1)[0]
          : tty.getWindowSize()[1]
        : 75,
    };

    /**
     * Expose some basic cursor interactions
     * that are common among reporters.
     */

    exports.cursor = {
      hide() {
        process.stdout.write('\u001b[?25l');
      },

      show() {
        process.stdout.write('\u001b[?25h');
      },

      deleteLine() {
        process.stdout.write('\u001b[2K');
      },

      beginningOfLine() {
        process.stdout.write('\u001b[0G');
      },

      CR() {
        exports.cursor.deleteLine();
        exports.cursor.beginningOfLine();
      },
    };

    /**
     * Outut the given `failures` as a list.
     *
     * @param {Array} failures
     * @api public
     */

    exports.list = function (failures) {
      console.error();
      failures.forEach((test, i) => {
        // format
        let fmt = color('error title', '  %s) %s:\n')
          + color('error message', '     %s')
          + color('error stack', '\n%s\n');

        // msg
        let { err } = test;
           let message = err.message || '';
           let stack = err.stack || message;
           let index = stack.indexOf(message) + message.length;
           let msg = stack.slice(0, index);
           let {actual} = err;
           let {expected} = err;
           let escape = true;

        // explicitly show diff
        if (err.showDiff) {
          escape = false;
          err.actual = actual = JSON.stringify(actual, null, 2);
          err.expected = expected = JSON.stringify(expected, null, 2);
        }

        // actual / expected diff
        if (typeof actual === 'string' && typeof expected === 'string') {
          const len = Math.max(actual.length, expected.length);

          if (len < 20) msg = errorDiff(err, 'Chars', escape);
          else msg = errorDiff(err, 'Words', escape);

          // linenos
          const lines = msg.split('\n');
          if (lines.length > 4) {
            const width = String(lines.length).length;
            msg = lines.map((str, i) => `${pad(++i, width)  } |` + ` ${  str}`).join('\n');
          }

          // legend
          msg = `\n${
             color('diff removed', 'actual')
             } ${
             color('diff added', 'expected')
             }\n\n${
             msg
             }\n`;

          // indent
          msg = msg.replace(/^/gm, '      ');

          fmt = color('error title', '  %s) %s:\n%s')
            + color('error stack', '\n%s\n');
        }

        // indent stack trace without msg
        stack = stack.slice(index ? index + 1 : index)
          .replace(/^/gm, '  ');

        console.error(fmt, (i + 1), test.fullTitle(), msg, stack);
      });
    };

    /**
     * Initialize a new `Base` reporter.
     *
     * All other reporters generally
     * inherit from this reporter, providing
     * stats such as test duration, number
     * of tests passed / failed etc.
     *
     * @param {Runner} runner
     * @api public
     */

    function Base(runner) {
      const self = this,
         stats = this.stats = {
 suites: 0, tests: 0, passes: 0, pending: 0, failures: 0 
},
         failures = this.failures = [];

      if (!runner) return;
      this.runner = runner;

      runner.stats = stats;

      runner.on('start', () => {
        stats.start = new Date();
      });

      runner.on('suite', (suite) => {
        stats.suites = stats.suites || 0;
        suite.root || stats.suites++;
      });

      runner.on('test end', (test) => {
        stats.tests = stats.tests || 0;
        stats.tests++;
      });

      runner.on('pass', (test) => {
        stats.passes = stats.passes || 0;

        const medium = test.slow() / 2;
        test.speed = test.duration > test.slow()
          ? 'slow'
          : test.duration > medium
            ? 'medium'
            : 'fast';

        stats.passes++;
      });

      runner.on('fail', (test, err) => {
        stats.failures = stats.failures || 0;
        stats.failures++;
        test.err = err;
        failures.push(test);
      });

      runner.on('end', () => {
        stats.end = new Date();
        stats.duration = new Date() - stats.start;
      });

      runner.on('pending', () => {
        stats.pending++;
      });
    }

    /**
     * Output common epilogue used by many of
     * the bundled reporters.
     *
     * @api public
     */

    Base.prototype.epilogue = function () {
      let { stats } = this;
         let fmt;
         let tests;

      console.log();

      function pluralize(n) {
        return n == 1 ? 'test' : 'tests';
      }

      // failure
      if (stats.failures) {
        fmt = color('bright fail', `  ${  exports.symbols.err}`)
          + color('fail', ' %d of %d %s failed')
          + color('light', ':');

        console.error(
          fmt,
          stats.failures,
          this.runner.total,
          pluralize(this.runner.total),
);

        Base.list(this.failures);
        console.error();
        return;
      }

      // pass
      fmt = color('bright pass', ' ')
        + color('green', ' %d %s complete')
        + color('light', ' (%s)');

      console.log(
        fmt,
        stats.tests || 0,
        pluralize(stats.tests),
        ms(stats.duration),
);

      // pending
      if (stats.pending) {
        fmt = color('pending', ' ')
          + color('pending', ' %d %s pending');

        console.log(fmt, stats.pending, pluralize(stats.pending));
      }

      console.log();
    };

    /**
     * Pad the given `str` to `len`.
     *
     * @param {String} str
     * @param {String} len
     * @return {String}
     * @api private
     */

    function pad(str, len) {
      str = String(str);
      return Array(len - str.length + 1).join(' ') + str;
    }

    /**
     * Return a character diff for `err`.
     *
     * @param {Error} err
     * @return {String}
     * @api private
     */

    function errorDiff(err, type, escape) {
      return diff[`diff${  type}`](err.actual, err.expected).map((str) => {
        if (escape) {
          str.value = str.value
            .replace(/\t/g, '<tab>')
            .replace(/\r/g, '<CR>')
            .replace(/\n/g, '<LF>\n');
        }
        if (str.added) return colorLines('diff added', str.value);
        if (str.removed) return colorLines('diff removed', str.value);
        return str.value;
      }).join('');
    }

    /**
     * Color lines for `str`, using the color `name`.
     *
     * @param {String} name
     * @param {String} str
     * @return {String}
     * @api private
     */

    function colorLines(name, str) {
      return str.split('\n').map((str) => color(name, str)).join('\n');
    }
  }); // module: reporters/base.js

  require.register('reporters/doc.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       utils = require('../utils');

    /**
     * Expose `Doc`.
     */

    exports = module.exports = Doc;

    /**
     * Initialize a new `Doc` reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function Doc(runner) {
      Base.call(this, runner);

      let self = this;
         let {stats} = this;
         let {total} = runner;
         let indents = 2;

      function indent() {
        return Array(indents).join('  ');
      }

      runner.on('suite', (suite) => {
        if (suite.root) return;
        ++indents;
        console.log('%s<section class="suite">', indent());
        ++indents;
        console.log('%s<h1>%s</h1>', indent(), utils.escape(suite.title));
        console.log('%s<dl>', indent());
      });

      runner.on('suite end', (suite) => {
        if (suite.root) return;
        console.log('%s</dl>', indent());
        --indents;
        console.log('%s</section>', indent());
        --indents;
      });

      runner.on('pass', (test) => {
        console.log('%s  <dt>%s</dt>', indent(), utils.escape(test.title));
        const code = utils.escape(utils.clean(test.fn.toString()));
        console.log('%s  <dd><pre><code>%s</code></pre></dd>', indent(), code);
      });
    }
  }); // module: reporters/doc.js

  require.register('reporters/dot.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       {color} = Base;

    /**
     * Expose `Dot`.
     */

    exports = module.exports = Dot;

    /**
     * Initialize a new `Dot` matrix test reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function Dot(runner) {
      Base.call(this, runner);

      let self = this;
         let {stats} = this;
         let width = Base.window.width * 0.75 | 0;
         let n = 0;

      runner.on('start', () => {
        process.stdout.write('\n  ');
      });

      runner.on('pending', (test) => {
        process.stdout.write(color('pending', Base.symbols.dot));
      });

      runner.on('pass', (test) => {
        if (++n % width == 0) process.stdout.write('\n  ');
        if (test.speed == 'slow') {
          process.stdout.write(color('bright yellow', Base.symbols.dot));
        } else {
          process.stdout.write(color(test.speed, Base.symbols.dot));
        }
      });

      runner.on('fail', (test, err) => {
        if (++n % width == 0) process.stdout.write('\n  ');
        process.stdout.write(color('fail', Base.symbols.dot));
      });

      runner.on('end', () => {
        console.log();
        self.epilogue();
      });
    }

    /**
     * Inherit from `Base.prototype`.
     */

    function F() {
    }
    F.prototype = Base.prototype;
    Dot.prototype = new F();
    Dot.prototype.constructor = Dot;
  }); // module: reporters/dot.js

  require.register('reporters/html-cov.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const JSONCov = require('./json-cov'),
       fs = require('browser/fs');

    /**
     * Expose `HTMLCov`.
     */

    exports = module.exports = HTMLCov;

    /**
     * Initialize a new `JsCoverage` reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function HTMLCov(runner) {
      const jade = require('jade'),
         file = `${__dirname  }/templates/coverage.jade`,
         str = fs.readFileSync(file, 'utf8'),
         fn = jade.compile(str, { filename: file }),
         self = this;

      JSONCov.call(this, runner, false);

      runner.on('end', () => {
        process.stdout.write(fn({
          cov: self.cov,
          coverageClass
        }));
      });
    }

    /**
     * Return coverage class for `n`.
     *
     * @return {String}
     * @api private
     */

    function coverageClass(n) {
      if (n >= 75) return 'high';
      if (n >= 50) return 'medium';
      if (n >= 25) return 'low';
      return 'terrible';
    }
  }); // module: reporters/html-cov.js

  require.register('reporters/html.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       utils = require('../utils'),
       Progress = require('../browser/progress'),
       {escape} = utils;

    /**
     * Save timer references to avoid Sinon interfering (see GH-237).
     */

    let { Date } = global;
       let {setTimeout} = global;
       let {setInterval} = global;
       let {clearTimeout} = global;
       let { clearInterval } = global;

    /**
     * Expose `Doc`.
     */

    exports = module.exports = HTML;

    /**
     * Stats template.
     */

    const statsTemplate = '<ul id="mocha-stats">'
      + '<li class="progress"><canvas width="40" height="40"></canvas></li>'
      + '<li class="passes"><a href="#">passes:</a> <em>0</em></li>'
      + '<li class="failures"><a href="#">failures:</a> <em>0</em></li>'
      + '<li class="duration">duration: <em>0</em>s</li>'
      + '</ul>';

    /**
     * Initialize a new `Doc` reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function HTML(runner, root) {
      Base.call(this, runner);

      let self = this;
         let {stats} = this;
         let {total} = runner;
         let stat = fragment(statsTemplate);
         let items = stat.getElementsByTagName('li');
         let passes = items[1].getElementsByTagName('em')[0];
         let passesLink = items[1].getElementsByTagName('a')[0];
         let failures = items[2].getElementsByTagName('em')[0];
         let failuresLink = items[2].getElementsByTagName('a')[0];
         let duration = items[3].getElementsByTagName('em')[0];
         let canvas = stat.getElementsByTagName('canvas')[0];
         let report = fragment('<ul id="mocha-report"></ul>');
         let stack = [report];
         let progress;
         let ctx;

      root = root || document.getElementById('mocha');

      if (canvas.getContext) {
        const ratio = window.devicePixelRatio || 1;
        canvas.style.width = canvas.width;
        canvas.style.height = canvas.height;
        canvas.width *= ratio;
        canvas.height *= ratio;
        ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        progress = new Progress();
      }

      if (!root) return error('#mocha div missing, add it to your document');

      // pass toggle
      on(passesLink, 'click', () => {
        unhide();
        const name = /pass/.test(report.className) ? '' : ' pass';
        report.className = report.className.replace(/fail|pass/g, '') + name;
        if (report.className.trim()) hideSuitesWithout('test pass');
      });

      // failure toggle
      on(failuresLink, 'click', () => {
        unhide();
        const name = /fail/.test(report.className) ? '' : ' fail';
        report.className = report.className.replace(/fail|pass/g, '') + name;
        if (report.className.trim()) hideSuitesWithout('test fail');
      });

      root.appendChild(stat);
      root.appendChild(report);

      if (progress) progress.size(40);

      runner.on('suite', (suite) => {
        if (suite.root) return;

        // suite
        const url = '?grep=' + encodeURIComponent(suite.fullTitle());
        const el = fragment('<li class="suite"><h1><a href="%s">%s</a></h1></li>', url, escape(suite.title));

        // container
        stack[0].appendChild(el);
        stack.unshift(document.createElement('ul'));
        el.appendChild(stack[0]);
      });

      runner.on('suite end', (suite) => {
        if (suite.root) return;
        stack.shift();
      });

      runner.on('fail', (test, err) => {
        if (test.type == 'hook') runner.emit('test end', test);
      });

      runner.on('test end', function (test) {
        window.scrollTo(0, document.body.scrollHeight);

        // TODO: add to stats
        const percent = stats.tests / this.total * 100 | 0;
        if (progress) progress.update(percent).draw(ctx);

        // update stats
        const ms = new Date() - stats.start;
        text(passes, stats.passes);
        text(failures, stats.failures);
        text(duration, (ms / 1000).toFixed(2));

        // test
        if (test.state == 'passed') {
          var el = fragment('<li class="test pass %e"><h2>%e<span class="duration">%ems</span> <a href="?grep=%e" class="replay">‣</a></h2></li>', test.speed, test.title, test.duration, encodeURIComponent(test.fullTitle()));
        } else if (test.pending) {
          var el = fragment('<li class="test pass pending"><h2>%e</h2></li>', test.title);
        } else {
          var el = fragment('<li class="test fail"><h2>%e <a href="?grep=%e" class="replay">‣</a></h2></li>', test.title, encodeURIComponent(test.fullTitle()));
          let str = test.err.stack || test.err.toString();

          // FF / Opera do not add the message
          if (!~str.indexOf(test.err.message)) {
            str = `${test.err.message }\n${ str}`;
          }

          // <=IE7 stringifies to [Object Error]. Since it can be overloaded, we
          // check for the result of the stringifying.
          if (str == '[object Error]') str = test.err.message;

          // Safari doesn't give you a stack. Let's at least provide a source line.
          if (!test.err.stack && test.err.sourceURL && test.err.line !== undefined) {
            str += `\n(${  test.err.sourceURL  }:${  test.err.line  })`;
          }

          el.appendChild(fragment('<pre class="error">%e</pre>', str));
        }

        // toggle code
        // TODO: defer
        if (!test.pending) {
          const h2 = el.getElementsByTagName('h2')[0];

          on(h2, 'click', () => {
            pre.style.display = pre.style.display == 'none'
              ? 'block'
              : 'none';
          });

          var pre = fragment('<pre><code>%e</code></pre>', utils.clean(test.fn.toString()));
          el.appendChild(pre);
          pre.style.display = 'none';
        }

        // Don't call .appendChild if #mocha-report was already .shift()'ed off the stack.
        if (stack[0]) stack[0].appendChild(el);
      });
    }

    /**
     * Display error `msg`.
     */

    function error(msg) {
      document.body.appendChild(fragment('<div id="mocha-error">%s</div>', msg));
    }

    /**
     * Return a DOM fragment from `html`.
     */

    function fragment(html) {
      let args = arguments;
         let div = document.createElement('div');
         let i = 1;

      div.innerHTML = html.replace(/%([se])/g, (_, type) => {
        switch (type) {
          case 's':
            return String(args[i++]);
          case 'e':
            return escape(args[i++]);
        }
      });

      return div.firstChild;
    }

    /**
     * Check for suites that do not have elements
     * with `classname`, and hide them.
     */

    function hideSuitesWithout(classname) {
      const suites = document.getElementsByClassName('suite');
      for (let i = 0; i < suites.length; i++) {
        const els = suites[i].getElementsByClassName(classname);
        if (els.length == 0) suites[i].className += ' hidden';
      }
    }

    /**
     * Unhide .hidden suites.
     */

    function unhide() {
      const els = document.getElementsByClassName('suite hidden');
      for (let i = 0; i < els.length; ++i) {
        els[i].className = els[i].className.replace('suite hidden', 'suite');
      }
    }

    /**
     * Set `el` text to `str`.
     */

    function text(el, str) {
      if (el.textContent) {
        el.textContent = str;
      } else {
        el.innerText = str;
      }
    }

    /**
     * Listen on `event` with callback `fn`.
     */

    function on(el, event, fn) {
      if (el.addEventListener) {
        el.addEventListener(event, fn, false);
      } else {
        el.attachEvent(`on${  event}`, fn);
      }
    }
  }); // module: reporters/html.js

  require.register('reporters/index.js', (module, exports, require) => {
    exports.Base = require('./base');
    exports.Dot = require('./dot');
    exports.Doc = require('./doc');
    exports.TAP = require('./tap');
    exports.JSON = require('./json');
    exports.HTML = require('./html');
    exports.List = require('./list');
    exports.Min = require('./min');
    exports.Spec = require('./spec');
    exports.Nyan = require('./nyan');
    exports.XUnit = require('./xunit');
    exports.Markdown = require('./markdown');
    exports.Progress = require('./progress');
    exports.Landing = require('./landing');
    exports.JSONCov = require('./json-cov');
    exports.HTMLCov = require('./html-cov');
    exports.JSONStream = require('./json-stream');
    exports.Teamcity = require('./teamcity');
  }); // module: reporters/index.js

  require.register('reporters/json-cov.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base');

    /**
     * Expose `JSONCov`.
     */

    exports = module.exports = JSONCov;

    /**
     * Initialize a new `JsCoverage` reporter.
     *
     * @param {Runner} runner
     * @param {Boolean} output
     * @api public
     */

    function JSONCov(runner, output) {
      var self = this;
         var output = arguments.length == 1 ? true : output;

      Base.call(this, runner);

      const tests = [],
         failures = [],
         passes = [];

      runner.on('test end', (test) => {
        tests.push(test);
      });

      runner.on('pass', (test) => {
        passes.push(test);
      });

      runner.on('fail', (test) => {
        failures.push(test);
      });

      runner.on('end', () => {
        const cov = global._$jscoverage || {};
        const result = self.cov = map(cov);
        result.stats = self.stats;
        result.tests = tests.map(clean);
        result.failures = failures.map(clean);
        result.passes = passes.map(clean);
        if (!output) return;
        process.stdout.write(JSON.stringify(result, null, 2));
      });
    }

    /**
     * Map jscoverage data to a JSON structure
     * suitable for reporting.
     *
     * @param {Object} cov
     * @return {Object}
     * @api private
     */

    function map(cov) {
      const ret = {
        instrumentation: 'node-jscoverage',
         sloc: 0,
         hits: 0,
         misses: 0,
         coverage: 0,
         files: [],
      };

      for (const filename in cov) {
        const data = coverage(filename, cov[filename]);
        ret.files.push(data);
        ret.hits += data.hits;
        ret.misses += data.misses;
        ret.sloc += data.sloc;
      }

      ret.files.sort((a, b) => a.filename.localeCompare(b.filename));

      if (ret.sloc > 0) {
        ret.coverage = (ret.hits / ret.sloc) * 100;
      }

      return ret;
    }

    /**
     * Map jscoverage data for a single source file
     * to a JSON structure suitable for reporting.
     *
     * @param {String} filename name of the source file
     * @param {Object} data jscoverage coverage data
     * @return {Object}
     * @api private
     */

    function coverage(filename, data) {
      const ret = {
        filename,
        coverage: 0,
        hits: 0,
        misses: 0,
        sloc: 0,
        source: {},
      };

      data.source.forEach((line, num) => {
        num++;

        if (data[num] === 0) {
          ret.misses++;
          ret.sloc++;
        } else if (data[num] !== undefined) {
          ret.hits++;
          ret.sloc++;
        }

        ret.source[num] = {
          source: line,
          coverage: data[num] === undefined
            ? ''
            : data[num],
        };
      });

      ret.coverage = ret.hits / ret.sloc * 100;

      return ret;
    }

    /**
     * Return a plain-object representation of `test`
     * free of cyclic properties etc.
     *
     * @param {Object} test
     * @return {Object}
     * @api private
     */

    function clean(test) {
      return {
        title: test.title,
        fullTitle: test.fullTitle(),
        duration: test.duration,
      };
    }
  }); // module: reporters/json-cov.js

  require.register('reporters/json-stream.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       {color} = Base;

    /**
     * Expose `List`.
     */

    exports = module.exports = List;

    /**
     * Initialize a new `List` test reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function List(runner) {
      Base.call(this, runner);

      const self = this,
         {stats} = this,
         {total} = runner;

      runner.on('start', () => {
        console.log(JSON.stringify(['start', { total }]));
      });

      runner.on('pass', (test) => {
        console.log(JSON.stringify(['pass', clean(test)]));
      });

      runner.on('fail', (test, err) => {
        console.log(JSON.stringify(['fail', clean(test)]));
      });

      runner.on('end', () => {
        process.stdout.write(JSON.stringify(['end', self.stats]));
      });
    }

    /**
     * Return a plain-object representation of `test`
     * free of cyclic properties etc.
     *
     * @param {Object} test
     * @return {Object}
     * @api private
     */

    function clean(test) {
      return {
        title: test.title,
        fullTitle: test.fullTitle(),
        duration: test.duration,
      };
    }
  }); // module: reporters/json-stream.js

  require.register('reporters/json.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       {cursor} = Base,
       {color} = Base;

    /**
     * Expose `JSON`.
     */

    exports = module.exports = JSONReporter;

    /**
     * Initialize a new `JSON` reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function JSONReporter(runner) {
      const self = this;
      Base.call(this, runner);

      const tests = [],
         failures = [],
         passes = [];

      runner.on('test end', (test) => {
        tests.push(test);
      });

      runner.on('pass', (test) => {
        passes.push(test);
      });

      runner.on('fail', (test) => {
        failures.push(test);
      });

      runner.on('end', () => {
        const obj = {
          stats: self.stats,
           tests: tests.map(clean),
           failures: failures.map(clean),
           passes: passes.map(clean),
        };

        process.stdout.write(JSON.stringify(obj, null, 2));
      });
    }

    /**
     * Return a plain-object representation of `test`
     * free of cyclic properties etc.
     *
     * @param {Object} test
     * @return {Object}
     * @api private
     */

    function clean(test) {
      return {
        title: test.title,
        fullTitle: test.fullTitle(),
        duration: test.duration,
      };
    }
  }); // module: reporters/json.js

  require.register('reporters/landing.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       {cursor} = Base,
       {color} = Base;

    /**
     * Expose `Landing`.
     */

    exports = module.exports = Landing;

    /**
     * Airplane color.
     */

    Base.colors.plane = 0;

    /**
     * Airplane crash color.
     */

    Base.colors['plane crash'] = 31;

    /**
     * Runway color.
     */

    Base.colors.runway = 90;

    /**
     * Initialize a new `Landing` reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function Landing(runner) {
      Base.call(this, runner);

      let self = this;
         let {stats} = this;
         let width = Base.window.width * 0.75 | 0;
         let {total} = runner;
         let stream = process.stdout;
         let plane = color('plane', '✈');
         let crashed = -1;
         let n = 0;

      function runway() {
        const buf = Array(width).join('-');
        return `  ${  color('runway', buf)}`;
      }

      runner.on('start', () => {
        stream.write('\n  ');
        cursor.hide();
      });

      runner.on('test end', (test) => {
        // check if the plane crashed
        const col = crashed == -1
          ? width * ++n / total | 0
          : crashed;

        // show the crash
        if (test.state == 'failed') {
          plane = color('plane crash', '✈');
          crashed = col;
        }

        // render landing strip
        stream.write('\u001b[4F\n\n');
        stream.write(runway());
        stream.write('\n  ');
        stream.write(color('runway', Array(col).join('⋅')));
        stream.write(plane);
        stream.write(color('runway', `${Array(width - col).join('⋅') }\n`));
        stream.write(runway());
        stream.write('\u001b[0m');
      });

      runner.on('end', () => {
        cursor.show();
        console.log();
        self.epilogue();
      });
    }

    /**
     * Inherit from `Base.prototype`.
     */

    function F() {
    }
    F.prototype = Base.prototype;
    Landing.prototype = new F();
    Landing.prototype.constructor = Landing;
  }); // module: reporters/landing.js

  require.register('reporters/list.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       {cursor} = Base,
       {color} = Base;

    /**
     * Expose `List`.
     */

    exports = module.exports = List;

    /**
     * Initialize a new `List` test reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function List(runner) {
      Base.call(this, runner);

      let self = this;
         let {stats} = this;
         let n = 0;

      runner.on('start', () => {
        console.log();
      });

      runner.on('test', (test) => {
        process.stdout.write(color('pass', `    ${  test.fullTitle()  }: `));
      });

      runner.on('pending', (test) => {
        const fmt = color('checkmark', '  -')
          + color('pending', ' %s');
        console.log(fmt, test.fullTitle());
      });

      runner.on('pass', (test) => {
        const fmt = color('checkmark', '  ' + Base.symbols.dot)
          + color('pass', ' %s: ')
          + color(test.speed, '%dms');
        cursor.CR();
        console.log(fmt, test.fullTitle(), test.duration);
      });

      runner.on('fail', (test, err) => {
        cursor.CR();
        console.log(color('fail', '  %d) %s'), ++n, test.fullTitle());
      });

      runner.on('end', self.epilogue.bind(self));
    }

    /**
     * Inherit from `Base.prototype`.
     */

    function F() {
    }
    F.prototype = Base.prototype;
    List.prototype = new F();
    List.prototype.constructor = List;
  }); // module: reporters/list.js

  require.register('reporters/markdown.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       utils = require('../utils');

    /**
     * Expose `Markdown`.
     */

    exports = module.exports = Markdown;

    /**
     * Initialize a new `Markdown` reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function Markdown(runner) {
      Base.call(this, runner);

      let self = this;
         let {stats} = this;
         let level = 0;
         let buf = '';

      function title(str) {
        return `${Array(level).join('#') } ${ str}`;
      }

      function indent() {
        return Array(level).join('  ');
      }

      function mapTOC(suite, obj) {
        const ret = obj;
        obj = obj[suite.title] = obj[suite.title] || { suite };
        suite.suites.forEach((suite) => {
          mapTOC(suite, obj);
        });
        return ret;
      }

      function stringifyTOC(obj, level) {
        ++level;
        let buf = '';
        let link;
        for (const key in obj) {
          if (key == 'suite') continue;
          if (key) link = ` - [${  key  }](#${  utils.slug(obj[key].suite.fullTitle())  })\n`;
          if (key) buf += Array(level).join('  ') + link;
          buf += stringifyTOC(obj[key], level);
        }
        --level;
        return buf;
      }

      function generateTOC(suite) {
        const obj = mapTOC(suite, {});
        return stringifyTOC(obj, 0);
      }

      generateTOC(runner.suite);

      runner.on('suite', (suite) => {
        ++level;
        const slug = utils.slug(suite.fullTitle());
        buf += `<a name="${  slug  }"></a>` + `\n`;
        buf += `${title(suite.title) }\n`;
      });

      runner.on('suite end', (suite) => {
        --level;
      });

      runner.on('pass', (test) => {
        const code = utils.clean(test.fn.toString());
        buf += `${test.title }.\n`;
        buf += '\n```js\n';
        buf += `${code }\n`;
        buf += '```\n\n';
      });

      runner.on('end', () => {
        process.stdout.write('# TOC\n');
        process.stdout.write(generateTOC(runner.suite));
        process.stdout.write(buf);
      });
    }
  }); // module: reporters/markdown.js

  require.register('reporters/min.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base');

    /**
     * Expose `Min`.
     */

    exports = module.exports = Min;

    /**
     * Initialize a new `Min` minimal test reporter (best used with --watch).
     *
     * @param {Runner} runner
     * @api public
     */

    function Min(runner) {
      Base.call(this, runner);

      runner.on('start', () => {
        // clear screen
        process.stdout.write('\u001b[2J');
        // set cursor position
        process.stdout.write('\u001b[1;3H');
      });

      runner.on('end', this.epilogue.bind(this));
    }

    /**
     * Inherit from `Base.prototype`.
     */

    function F() {
    }
    F.prototype = Base.prototype;
    Min.prototype = new F();
    Min.prototype.constructor = Min;
  }); // module: reporters/min.js

  require.register('reporters/nyan.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       {color} = Base;

    /**
     * Expose `Dot`.
     */

    exports = module.exports = NyanCat;

    /**
     * Initialize a new `Dot` matrix test reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function NyanCat(runner) {
      Base.call(this, runner);

      const self = this,
         {stats} = this,
         width = Base.window.width * 0.75 | 0,
         rainbowColors = this.rainbowColors = self.generateColors(),
         colorIndex = this.colorIndex = 0,
         numerOfLines = this.numberOfLines = 4,
         trajectories = this.trajectories = [[], [], [], []],
         nyanCatWidth = this.nyanCatWidth = 11,
         trajectoryWidthMax = this.trajectoryWidthMax = (width - nyanCatWidth),
         scoreboardWidth = this.scoreboardWidth = 5,
         tick = this.tick = 0,
         n = 0;

      runner.on('start', () => {
        Base.cursor.hide();
        self.draw('start');
      });

      runner.on('pending', (test) => {
        self.draw('pending');
      });

      runner.on('pass', (test) => {
        self.draw('pass');
      });

      runner.on('fail', (test, err) => {
        self.draw('fail');
      });

      runner.on('end', () => {
        Base.cursor.show();
        for (let i = 0; i < self.numberOfLines; i++) write('\n');
        self.epilogue();
      });
    }

    /**
     * Draw the nyan cat with runner `status`.
     *
     * @param {String} status
     * @api private
     */

    NyanCat.prototype.draw = function (status) {
      this.appendRainbow();
      this.drawScoreboard();
      this.drawRainbow();
      this.drawNyanCat(status);
      this.tick = !this.tick;
    };

    /**
     * Draw the "scoreboard" showing the number
     * of passes, failures and pending tests.
     *
     * @api private
     */

    NyanCat.prototype.drawScoreboard = function () {
      const {stats} = this;
      const {colors} = Base;

      function draw(color, n) {
        write(' ');
        write(`\u001b[${  color  }m${  n  }\u001b[0m`);
        write('\n');
      }

      draw(colors.green, stats.passes);
      draw(colors.fail, stats.failures);
      draw(colors.pending, stats.pending);
      write('\n');

      this.cursorUp(this.numberOfLines);
    };

    /**
     * Append the rainbow.
     *
     * @api private
     */

    NyanCat.prototype.appendRainbow = function () {
      const segment = this.tick ? '_' : '-';
      const rainbowified = this.rainbowify(segment);

      for (let index = 0; index < this.numberOfLines; index++) {
        const trajectory = this.trajectories[index];
        if (trajectory.length >= this.trajectoryWidthMax) trajectory.shift();
        trajectory.push(rainbowified);
      }
    };

    /**
     * Draw the rainbow.
     *
     * @api private
     */

    NyanCat.prototype.drawRainbow = function () {
      const self = this;

      this.trajectories.forEach((line, index) => {
        write(`\u001b[${  self.scoreboardWidth  }C`);
        write(line.join(''));
        write('\n');
      });

      this.cursorUp(this.numberOfLines);
    };

    /**
     * Draw the nyan cat with `status`.
     *
     * @param {String} status
     * @api private
     */

    NyanCat.prototype.drawNyanCat = function (status) {
      const self = this;
      const startWidth = this.scoreboardWidth + this.trajectories[0].length;

      [0, 1, 2, 3].forEach((index) => {
        write(`\u001b[${  startWidth  }C`);

        switch (index) {
          case 0:
            write('_,------,');
            write('\n');
            break;
          case 1:
            var padding = self.tick ? '  ' : '   ';
            write(`_|${  padding  }/\\_/\\ `);
            write('\n');
            break;
          case 2:
            var padding = self.tick ? '_' : '__';
            var tail = self.tick ? '~' : '^';
            var face;
            switch (status) {
              case 'pass':
                face = '( ^ .^)';
                break;
              case 'fail':
                face = '( o .o)';
                break;
              default:
                face = '( - .-)';
            }
            write(`${tail }|${ padding }${face } `);
            write('\n');
            break;
          case 3:
            var padding = self.tick ? ' ' : '  ';
            write(`${padding }""  "" `);
            write('\n');
            break;
        }
      });

      this.cursorUp(this.numberOfLines);
    };

    /**
     * Move cursor up `n`.
     *
     * @param {Number} n
     * @api private
     */

    NyanCat.prototype.cursorUp = function (n) {
      write(`\u001b[${  n  }A`);
    };

    /**
     * Move cursor down `n`.
     *
     * @param {Number} n
     * @api private
     */

    NyanCat.prototype.cursorDown = function (n) {
      write(`\u001b[${  n  }B`);
    };

    /**
     * Generate rainbow colors.
     *
     * @return {Array}
     * @api private
     */

    NyanCat.prototype.generateColors = function () {
      const colors = [];

      for (let i = 0; i < (6 * 7); i++) {
        const pi3 = Math.floor(Math.PI / 3);
        const n = (i * (1.0 / 6));
        const r = Math.floor(3 * Math.sin(n) + 3);
        const g = Math.floor(3 * Math.sin(n + 2 * pi3) + 3);
        const b = Math.floor(3 * Math.sin(n + 4 * pi3) + 3);
        colors.push(36 * r + 6 * g + b + 16);
      }

      return colors;
    };

    /**
     * Apply rainbow to the given `str`.
     *
     * @param {String} str
     * @return {String}
     * @api private
     */

    NyanCat.prototype.rainbowify = function (str) {
      const color = this.rainbowColors[this.colorIndex % this.rainbowColors.length];
      this.colorIndex += 1;
      return `\u001b[38;5;${  color  }m${  str  }\u001b[0m`;
    };

    /**
     * Stdout helper.
     */

    function write(string) {
      process.stdout.write(string);
    }

    /**
     * Inherit from `Base.prototype`.
     */

    function F() {
    }
    F.prototype = Base.prototype;
    NyanCat.prototype = new F();
    NyanCat.prototype.constructor = NyanCat;
  }); // module: reporters/nyan.js

  require.register('reporters/progress.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       {cursor} = Base,
       {color} = Base;

    /**
     * Expose `Progress`.
     */

    exports = module.exports = Progress;

    /**
     * General progress bar color.
     */

    Base.colors.progress = 90;

    /**
     * Initialize a new `Progress` bar test reporter.
     *
     * @param {Runner} runner
     * @param {Object} options
     * @api public
     */

    function Progress(runner, options) {
      Base.call(this, runner);

      var self = this;
         var options = options || {};
         var {stats} = this;
         var width = Base.window.width * 0.50 | 0;
         var {total} = runner;
         var complete = 0;
         var { max } = Math;

      // default chars
      options.open = options.open || '[';
      options.complete = options.complete || '▬';
      options.incomplete = options.incomplete || Base.symbols.dot;
      options.close = options.close || ']';
      options.verbose = false;

      // tests started
      runner.on('start', () => {
        console.log();
        cursor.hide();
      });

      // tests complete
      runner.on('test end', () => {
        complete++;
        const incomplete = total - complete,
           percent = complete / total,
           n = width * percent | 0,
           i = width - n;

        cursor.CR();
        process.stdout.write('\u001b[J');
        process.stdout.write(color('progress', `  ${  options.open}`));
        process.stdout.write(Array(n).join(options.complete));
        process.stdout.write(Array(i).join(options.incomplete));
        process.stdout.write(color('progress', options.close));
        if (options.verbose) {
          process.stdout.write(color('progress', ` ${  complete  } of ${  total}`));
        }
      });

      // tests are complete, output some stats
      // and the failures if any
      runner.on('end', () => {
        cursor.show();
        console.log();
        self.epilogue();
      });
    }

    /**
     * Inherit from `Base.prototype`.
     */

    function F() {
    }
    F.prototype = Base.prototype;
    Progress.prototype = new F();
    Progress.prototype.constructor = Progress;
  }); // module: reporters/progress.js

  require.register('reporters/spec.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       {cursor} = Base,
       {color} = Base;

    /**
     * Expose `Spec`.
     */

    exports = module.exports = Spec;

    /**
     * Initialize a new `Spec` test reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function Spec(runner) {
      Base.call(this, runner);

      let self = this;
         let {stats} = this;
         let indents = 0;
         let n = 0;

      function indent() {
        return Array(indents).join('  ');
      }

      runner.on('start', () => {
        console.log();
      });

      runner.on('suite', (suite) => {
        ++indents;
        console.log(color('suite', '%s%s'), indent(), suite.title);
      });

      runner.on('suite end', (suite) => {
        --indents;
        if (indents == 1) console.log();
      });

      runner.on('test', (test) => {
        process.stdout.write(indent() + color('pass', `  ◦ ${  test.title  }: `));
      });

      runner.on('pending', (test) => {
        const fmt = indent() + color('pending', '  - %s');
        console.log(fmt, test.title);
      });

      runner.on('pass', (test) => {
        if (test.speed == 'fast') {
          var fmt = indent()
            + color('checkmark', `  ${  Base.symbols.ok}`)
            + color('pass', ' %s ');
          cursor.CR();
          console.log(fmt, test.title);
        } else {
          var fmt = indent()
            + color('checkmark', `  ${  Base.symbols.ok}`)
            + color('pass', ' %s ')
            + color(test.speed, '(%dms)');
          cursor.CR();
          console.log(fmt, test.title, test.duration);
        }
      });

      runner.on('fail', (test, err) => {
        cursor.CR();
        console.log(indent() + color('fail', '  %d) %s'), ++n, test.title);
      });

      runner.on('end', self.epilogue.bind(self));
    }

    /**
     * Inherit from `Base.prototype`.
     */

    function F() {
    }
    F.prototype = Base.prototype;
    Spec.prototype = new F();
    Spec.prototype.constructor = Spec;
  }); // module: reporters/spec.js

  require.register('reporters/tap.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       {cursor} = Base,
       {color} = Base;

    /**
     * Expose `TAP`.
     */

    exports = module.exports = TAP;

    /**
     * Initialize a new `TAP` reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function TAP(runner) {
      Base.call(this, runner);

      let self = this;
         let {stats} = this;
         let n = 1;
         let passes = 0;
         let failures = 0;

      runner.on('start', () => {
        const total = runner.grepTotal(runner.suite);
        console.log('%d..%d', 1, total);
      });

      runner.on('test end', () => {
        ++n;
      });

      runner.on('pending', (test) => {
        console.log('ok %d %s # SKIP -', n, title(test));
      });

      runner.on('pass', (test) => {
        passes++;
        console.log('ok %d %s', n, title(test));
      });

      runner.on('fail', (test, err) => {
        failures++;
        console.log('not ok %d %s', n, title(test));
        if (err.stack) console.log(err.stack.replace(/^/gm, '  '));
      });

      runner.on('end', () => {
        console.log(`# tests ${  passes + failures}`);
        console.log(`# pass ${  passes}`);
        console.log(`# fail ${  failures}`);
      });
    }

    /**
     * Return a TAP-safe title of `test`
     *
     * @param {Object} test
     * @return {String}
     * @api private
     */

    function title(test) {
      return test.fullTitle().replace(/#/g, '');
    }
  }); // module: reporters/tap.js

  require.register('reporters/teamcity.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base');

    /**
     * Expose `Teamcity`.
     */

    exports = module.exports = Teamcity;

    /**
     * Initialize a new `Teamcity` reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function Teamcity(runner) {
      Base.call(this, runner);
      const {stats} = this;

      runner.on('start', () => {
        console.log("##teamcity[testSuiteStarted name='mocha.suite']");
      });

      runner.on('test', (test) => {
        console.log(`##teamcity[testStarted name='${ escape(test.fullTitle()) }']`);
      });

      runner.on('fail', (test, err) => {
        console.log(`##teamcity[testFailed name='${ escape(test.fullTitle()) }' message='${ escape(err.message) }']`);
      });

      runner.on('pending', (test) => {
        console.log(`##teamcity[testIgnored name='${ escape(test.fullTitle()) }' message='pending']`);
      });

      runner.on('test end', (test) => {
        console.log(`##teamcity[testFinished name='${ escape(test.fullTitle()) }' duration='${ test.duration }']`);
      });

      runner.on('end', () => {
        console.log(`##teamcity[testSuiteFinished name='mocha.suite' duration='${ stats.duration }']`);
      });
    }

    /**
     * Escape the given `str`.
     */

    function escape(str) {
      return str
        .replace(/\|/g, '||')
        .replace(/\n/g, '|n')
        .replace(/\r/g, '|r')
        .replace(/\[/g, '|[')
        .replace(/\]/g, '|]')
        .replace(/\u0085/g, '|x')
        .replace(/\u2028/g, '|l')
        .replace(/\u2029/g, '|p')
        .replace(/'/g, "|'");
    }
  }); // module: reporters/teamcity.js

  require.register('reporters/xunit.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Base = require('./base'),
       utils = require('../utils'),
       {escape} = utils;

    /**
     * Save timer references to avoid Sinon interfering (see GH-237).
     */

    let { Date } = global;
       let {setTimeout} = global;
       let {setInterval} = global;
       let {clearTimeout} = global;
       let { clearInterval } = global;

    /**
     * Expose `XUnit`.
     */

    exports = module.exports = XUnit;

    /**
     * Initialize a new `XUnit` reporter.
     *
     * @param {Runner} runner
     * @api public
     */

    function XUnit(runner) {
      Base.call(this, runner);
      const {stats} = this,
         tests = [],
         self = this;

      runner.on('pass', (test) => {
        tests.push(test);
      });

      runner.on('fail', (test) => {
        tests.push(test);
      });

      runner.on('end', () => {
        console.log(tag('testsuite', {
          name: 'Mocha Tests',
          tests: stats.tests,
          failures: stats.failures,
          errors: stats.failures,
          skip: stats.tests - stats.failures - stats.passes,
          timestamp: (new Date()).toUTCString(),
          time: stats.duration / 1000,
        }, false));

        tests.forEach(test);
        console.log('</testsuite>');
      });
    }

    /**
     * Inherit from `Base.prototype`.
     */

    function F() {
    }
    F.prototype = Base.prototype;
    XUnit.prototype = new F();
    XUnit.prototype.constructor = XUnit;

    /**
     * Output tag for the given `test.`
     */

    function test(test) {
      const attrs = {
        classname: test.parent.fullTitle(),
         name: test.title,
         time: test.duration / 1000,
      };

      if (test.state == 'failed') {
        const {err} = test;
        attrs.message = escape(err.message);
        console.log(tag('testcase', attrs, false, tag('failure', attrs, false, cdata(err.stack))));
      } else if (test.pending) {
        console.log(tag('testcase', attrs, false, tag('skipped', {}, true)));
      } else {
        console.log(tag('testcase', attrs, true));
      }
    }

    /**
     * HTML tag helper.
     */

    function tag(name, attrs, close, content) {
      let end = close ? '/>' : '>';
         let pairs = [];
         let tag;

      for (const key in attrs) {
        pairs.push(`${key }="${ escape(attrs[key]) }"`);
      }

      tag = `<${  name  }${pairs.length ? ' ' + pairs.join(' ') : ''  }${end}`;
      if (content) tag += `${content }</${ name }${end}`;
      return tag;
    }

    /**
     * Return cdata escaped CDATA `str`.
     */

    function cdata(str) {
      return `<![CDATA[${  escape(str)  }]]>`;
    }
  }); // module: reporters/xunit.js

  require.register('runnable.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const {EventEmitter} = require("browser/events"),
       debug = require('browser/debug')('mocha:runnable'),
       milliseconds = require('./ms');

    /**
     * Save timer references to avoid Sinon interfering (see GH-237).
     */

    let { Date } = global;
       let {setTimeout} = global;
       let {setInterval} = global;
       let {clearTimeout} = global;
       let { clearInterval } = global;

    /**
     * Object#toString().
     */

    const {toString} = Object.prototype;

    /**
     * Expose `Runnable`.
     */

    module.exports = Runnable;

    /**
     * Initialize a new `Runnable` with the given `title` and callback `fn`.
     *
     * @param {String} title
     * @param {Function} fn
     * @api private
     */

    function Runnable(title, fn) {
      this.title = title;
      this.fn = fn;
      this.async = fn && fn.length;
      this.sync = !this.async;
      this._timeout = 2000;
      this._slow = 75;
      this.timedOut = false;
    }

    /**
     * Inherit from `EventEmitter.prototype`.
     */

    function F() {
    }
    F.prototype = EventEmitter.prototype;
    Runnable.prototype = new F();
    Runnable.prototype.constructor = Runnable;

    /**
     * Set & get timeout `ms`.
     *
     * @param {Number|String} ms
     * @return {Runnable|Number} ms or self
     * @api private
     */

    Runnable.prototype.timeout = function (ms) {
      if (arguments.length == 0) return this._timeout;
      if (typeof ms === 'string') ms = milliseconds(ms);
      debug('timeout %d', ms);
      this._timeout = ms;
      if (this.timer) this.resetTimeout();
      return this;
    };

    /**
     * Set & get slow `ms`.
     *
     * @param {Number|String} ms
     * @return {Runnable|Number} ms or self
     * @api private
     */

    Runnable.prototype.slow = function (ms) {
      if (arguments.length === 0) return this._slow;
      if (typeof ms === 'string') ms = milliseconds(ms);
      debug('timeout %d', ms);
      this._slow = ms;
      return this;
    };

    /**
     * Return the full title generated by recursively
     * concatenating the parent's full title.
     *
     * @return {String}
     * @api public
     */

    Runnable.prototype.fullTitle = function () {
      return `${this.parent.fullTitle() } ${ this.title}`;
    };

    /**
     * Clear the timeout.
     *
     * @api private
     */

    Runnable.prototype.clearTimeout = function () {
      clearTimeout(this.timer);
    };

    /**
     * Inspect the runnable void of private properties.
     *
     * @return {String}
     * @api private
     */

    Runnable.prototype.inspect = function () {
      return JSON.stringify(this, (key, val) => {
        if (key[0] == '_') return;
        if (key == 'parent') return '#<Suite>';
        if (key == 'ctx') return '#<Context>';
        return val;
      }, 2);
    };

    /**
     * Reset the timeout.
     *
     * @api private
     */

    Runnable.prototype.resetTimeout = function () {
      const self = this,
         ms = this.timeout();

      this.clearTimeout();
      if (ms) {
        this.timer = setTimeout(() => {
          self.callback(new Error(`timeout of ${  ms  }ms exceeded`));
          self.timedOut = true;
        }, ms);
      }
    };

    /**
     * Run the test and invoke `fn(err)`.
     *
     * @param {Function} fn
     * @api private
     */

    Runnable.prototype.run = function (fn) {
      let self = this;
         let ms = this.timeout();
         let start = new Date();
         let {ctx} = this;
         let finished;
         let emitted;

      if (ctx) ctx.runnable(this);

      // timeout
      if (this.async) {
        if (ms) {
          this.timer = setTimeout(() => {
            done(new Error(`timeout of ${  ms  }ms exceeded`));
            self.timedOut = true;
          }, ms);
        }
      }

      // called multiple times
      function multiple(err) {
        if (emitted) return;
        emitted = true;
        self.emit('error', err || new Error('done() called multiple times'));
      }

      // finished
      function done(err) {
        if (self.timedOut) return;
        if (finished) return multiple(err);
        self.clearTimeout();
        self.duration = new Date() - start;
        finished = true;
        fn(err);
      }

      // for .resetTimeout()
      this.callback = done;

      // async
      if (this.async) {
        try {
          this.fn.call(ctx, (err) => {
            if (err instanceof Error || toString.call(err) === '[object Error]') return done(err);
            if (err != null) return done(new Error(`done() invoked with non-Error: ${  err}`));
            done();
          });
        } catch (err) {
          done(err);
        }
        return;
      }

      if (this.asyncOnly) {
        return done(new Error('--async-only option in use without declaring `done()`'));
      }

      // sync
      try {
        if (!this.pending) this.fn.call(ctx);
        this.duration = new Date() - start;
        fn();
      } catch (err) {
        fn(err);
      }
    };
  }); // module: runnable.js

  require.register('runner.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const {EventEmitter} = require("browser/events"),
       debug = require('browser/debug')('mocha:runner'),
       Test = require('./test'),
       utils = require('./utils'),
       {filter} = utils,
       {keys} = utils,
       noop = function () {
      };

    /**
     * Non-enumerable globals.
     */

    const globals = [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'XMLHttpRequest',
      'Date'
    ];

    /**
     * Expose `Runner`.
     */

    module.exports = Runner;

    /**
     * Initialize a `Runner` for the given `suite`.
     *
     * Events:
     *
     *   - `start`  execution started
     *   - `end`  execution complete
     *   - `suite`  (suite) test suite execution started
     *   - `suite end`  (suite) all tests (and sub-suites) have finished
     *   - `test`  (test) test execution started
     *   - `test end`  (test) test completed
     *   - `hook`  (hook) hook execution started
     *   - `hook end`  (hook) hook complete
     *   - `pass`  (test) test passed
     *   - `fail`  (test, err) test failed
     *
     * @api public
     */

    function Runner(suite) {
      const self = this;
      this._globals = [];
      this.suite = suite;
      this.total = suite.total();
      this.failures = 0;
      this.on('test end', (test) => {
        self.checkGlobals(test);
      });
      this.on('hook end', (hook) => {
        self.checkGlobals(hook);
      });
      this.grep(/.*/);
      this.globals(this.globalProps().concat(['errno']));
    }

    /**
     * Inherit from `EventEmitter.prototype`.
     */

    function F() {
    }
    F.prototype = EventEmitter.prototype;
    Runner.prototype = new F();
    Runner.prototype.constructor = Runner;

    /**
     * Run tests with full titles matching `re`. Updates runner.total
     * with number of tests matched.
     *
     * @param {RegExp} re
     * @param {Boolean} invert
     * @return {Runner} for chaining
     * @api public
     */

    Runner.prototype.grep = function (re, invert) {
      debug('grep %s', re);
      this._grep = re;
      this._invert = invert;
      this.total = this.grepTotal(this.suite);
      return this;
    };

    /**
     * Returns the number of tests matching the grep search for the
     * given suite.
     *
     * @param {Suite} suite
     * @return {Number}
     * @api public
     */

    Runner.prototype.grepTotal = function (suite) {
      const self = this;
      let total = 0;

      suite.eachTest((test) => {
        let match = self._grep.test(test.fullTitle());
        if (self._invert) match = !match;
        if (match) total++;
      });

      return total;
    };

    /**
     * Return a list of global properties.
     *
     * @return {Array}
     * @api private
     */

    Runner.prototype.globalProps = function () {
      const props = utils.keys(global);

      // non-enumerables
      for (let i = 0; i < globals.length; ++i) {
        if (~utils.indexOf(props, globals[i])) continue;
        props.push(globals[i]);
      }

      return props;
    };

    /**
     * Allow the given `arr` of globals.
     *
     * @param {Array} arr
     * @return {Runner} for chaining
     * @api public
     */

    Runner.prototype.globals = function (arr) {
      if (arguments.length == 0) return this._globals;
      debug('globals %j', arr);
      utils.forEach(arr, function (arr) {
        this._globals.push(arr);
      }, this);
      return this;
    };

    /**
     * Check for global variable leaks.
     *
     * @api private
     */

    Runner.prototype.checkGlobals = function (test) {
      if (this.ignoreLeaks) return;
      let ok = this._globals;
      let globals = this.globalProps();
      let isNode = process.kill;
      let leaks;

      // check length - 2 ('errno' and 'location' globals)
      if (isNode && ok.length - globals.length == 1) return;
      if (ok.length - globals.length == 2) return;

      leaks = filterLeaks(ok, globals);
      this._globals = this._globals.concat(leaks);

      if (leaks.length > 1) {
        this.fail(test, new Error('global leaks detected: ' + leaks.join(', ') + ''));
      } else if (leaks.length) {
        this.fail(test, new Error('global leak detected: ' + leaks[0]));
      }
    };

    /**
     * Fail the given `test`.
     *
     * @param {Test} test
     * @param {Error} err
     * @api private
     */

    Runner.prototype.fail = function (test, err) {
      ++this.failures;
      test.state = 'failed';

      if (typeof err === 'string') {
        err = new Error(`the string "${  err  }" was thrown, throw an Error :)`);
      }

      this.emit('fail', test, err);
    };

    /**
     * Fail the given `hook` with `err`.
     *
     * Hook failures (currently) hard-end due
     * to that fact that a failing hook will
     * surely cause subsequent tests to fail,
     * causing jumbled reporting.
     *
     * @param {Hook} hook
     * @param {Error} err
     * @api private
     */

    Runner.prototype.failHook = function (hook, err) {
      this.fail(hook, err);
      this.emit('end');
    };

    /**
     * Run hook `name` callbacks and then invoke `fn()`.
     *
     * @param {String} name
     * @param {Function} function
     * @api private
     */

    Runner.prototype.hook = function (name, fn) {
      let { suite } = this;
         let hooks = suite['_' + name];
         let self = this;
         let timer;

      function next(i) {
        const hook = hooks[i];
        if (!hook) return fn();
        self.currentRunnable = hook;

        self.emit('hook', hook);

        hook.on('error', (err) => {
          self.failHook(hook, err);
        });

        hook.run((err) => {
          hook.removeAllListeners('error');
          const testError = hook.error();
          if (testError) self.fail(self.test, testError);
          if (err) return self.failHook(hook, err);
          self.emit('hook end', hook);
          next(++i);
        });
      }

      process.nextTick(() => {
        next(0);
      });
    };

    /**
     * Run hook `name` for the given array of `suites`
     * in order, and callback `fn(err)`.
     *
     * @param {String} name
     * @param {Array} suites
     * @param {Function} fn
     * @api private
     */

    Runner.prototype.hooks = function (name, suites, fn) {
      const self = this,
         orig = this.suite;

      function next(suite) {
        self.suite = suite;

        if (!suite) {
          self.suite = orig;
          return fn();
        }

        self.hook(name, (err) => {
          if (err) {
            self.suite = orig;
            return fn(err);
          }

          next(suites.pop());
        });
      }

      next(suites.pop());
    };

    /**
     * Run hooks from the top level down.
     *
     * @param {String} name
     * @param {Function} fn
     * @api private
     */

    Runner.prototype.hookUp = function (name, fn) {
      const suites = [this.suite].concat(this.parents()).reverse();
      this.hooks(name, suites, fn);
    };

    /**
     * Run hooks from the bottom up.
     *
     * @param {String} name
     * @param {Function} fn
     * @api private
     */

    Runner.prototype.hookDown = function (name, fn) {
      const suites = [this.suite].concat(this.parents());
      this.hooks(name, suites, fn);
    };

    /**
     * Return an array of parent Suites from
     * closest to furthest.
     *
     * @return {Array}
     * @api private
     */

    Runner.prototype.parents = function () {
      let { suite } = this;
         let suites = [];
      while (suite = suite.parent) suites.push(suite);
      return suites;
    };

    /**
     * Run the current test and callback `fn(err)`.
     *
     * @param {Function} fn
     * @api private
     */

    Runner.prototype.runTest = function (fn) {
      const {test} = this,
         self = this;

      if (this.asyncOnly) test.asyncOnly = true;

      try {
        test.on('error', (err) => {
          self.fail(test, err);
        });
        test.run(fn);
      } catch (err) {
        fn(err);
      }
    };

    /**
     * Run tests in the given `suite` and invoke
     * the callback `fn()` when complete.
     *
     * @param {Suite} suite
     * @param {Function} fn
     * @api private
     */

    Runner.prototype.runTests = function (suite, fn) {
      let self = this;
         let tests = suite.tests.slice();
         let test;

      function next(err) {
        // if we bail after first err
        if (self.failures && suite._bail) return fn();

        // next test
        test = tests.shift();

        // all done
        if (!test) return fn();

        // grep
        let match = self._grep.test(test.fullTitle());
        if (self._invert) match = !match;
        if (!match) return next();

        // pending
        if (test.pending) {
          self.emit('pending', test);
          self.emit('test end', test);
          return next();
        }

        // execute test and hook(s)
        self.emit('test', self.test = test);
        self.hookDown('beforeEach', () => {
          self.currentRunnable = self.test;
          self.runTest((err) => {
            test = self.test;

            if (err) {
              self.fail(test, err);
              self.emit('test end', test);
              return self.hookUp('afterEach', next);
            }

            test.state = 'passed';
            self.emit('pass', test);
            self.emit('test end', test);
            self.hookUp('afterEach', next);
          });
        });
      }

      this.next = next;
      next();
    };

    /**
     * Run the given `suite` and invoke the
     * callback `fn()` when complete.
     *
     * @param {Suite} suite
     * @param {Function} fn
     * @api private
     */

    Runner.prototype.runSuite = function (suite, fn) {
      let total = this.grepTotal(suite);
         let self = this;
         let i = 0;

      debug('run suite %s', suite.fullTitle());

      if (!total) return fn();

      this.emit('suite', this.suite = suite);

      function next() {
        const curr = suite.suites[i++];
        if (!curr) return done();
        self.runSuite(curr, next);
      }

      function done() {
        self.suite = suite;
        self.hook('afterAll', () => {
          self.emit('suite end', suite);
          fn();
        });
      }

      this.hook('beforeAll', () => {
        self.runTests(suite, next);
      });
    };

    /**
     * Handle uncaught exceptions.
     *
     * @param {Error} err
     * @api private
     */

    Runner.prototype.uncaught = function (err) {
      debug('uncaught exception %s', err.message);
      const runnable = this.currentRunnable;
      if (!runnable || runnable.state == 'failed') return;
      runnable.clearTimeout();
      err.uncaught = true;
      this.fail(runnable, err);

      // recover from test
      if (runnable.type == 'test') {
        this.emit('test end', runnable);
        this.hookUp('afterEach', this.next);
        return;
      }

      // bail on hooks
      this.emit('end');
    };

    /**
     * Run the root suite and invoke `fn(failures)`
     * on completion.
     *
     * @param {Function} fn
     * @return {Runner} for chaining
     * @api public
     */

    Runner.prototype.run = function (fn) {
      var self = this;
         var fn = fn || function () {
        };

      debug('start');

      // callback
      this.on('end', () => {
        debug('end');
        process.removeListener('uncaughtException', (err) => {
          self.uncaught(err);
        });
        fn(self.failures);
      });

      // run suites
      this.emit('start');
      this.runSuite(this.suite, () => {
        debug('finished running');
        self.emit('end');
      });

      // uncaught exception
      process.on('uncaughtException', (err) => {
        self.uncaught(err);
      });

      return this;
    };

    /**
     * Filter leaks with the given globals flagged as `ok`.
     *
     * @param {Array} ok
     * @param {Array} globals
     * @return {Array}
     * @api private
     */

    function filterLeaks(ok, globals) {
      return filter(globals, (key) => {
        const matched = filter(ok, (ok) => {
          if (~ok.indexOf('*')) return key.indexOf(ok.split("*")[0]) == 0;
          // Opera and IE expose global variables for HTML element IDs (issue #243)
          if (/^mocha-/.test(key)) return true;
          return key == ok;
        });
        return matched.length == 0 && (!global.navigator || key !== 'onerror');
      });
    }
  }); // module: runner.js

  require.register('suite.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const {EventEmitter} = require("browser/events"),
       debug = require('browser/debug')('mocha:suite'),
       milliseconds = require('./ms'),
       utils = require('./utils'),
       Hook = require('./hook');

    /**
     * Expose `Suite`.
     */

    exports = module.exports = Suite;

    /**
     * Create a new `Suite` with the given `title`
     * and parent `Suite`. When a suite with the
     * same title is already present, that suite
     * is returned to provide nicer reporter
     * and more flexible meta-testing.
     *
     * @param {Suite} parent
     * @param {String} title
     * @return {Suite}
     * @api public
     */

    exports.create = function (parent, title) {
      const suite = new Suite(title, parent.ctx);
      suite.parent = parent;
      if (parent.pending) suite.pending = true;
      title = suite.fullTitle();
      parent.addSuite(suite);
      return suite;
    };

    /**
     * Initialize a new `Suite` with the given
     * `title` and `ctx`.
     *
     * @param {String} title
     * @param {Context} ctx
     * @api private
     */

    function Suite(title, ctx) {
      this.title = title;
      this.ctx = ctx;
      this.suites = [];
      this.tests = [];
      this.pending = false;
      this._beforeEach = [];
      this._beforeAll = [];
      this._afterEach = [];
      this._afterAll = [];
      this.root = !title;
      this._timeout = 2000;
      this._slow = 75;
      this._bail = false;
    }

    /**
     * Inherit from `EventEmitter.prototype`.
     */

    function F() {
    }
    F.prototype = EventEmitter.prototype;
    Suite.prototype = new F();
    Suite.prototype.constructor = Suite;

    /**
     * Return a clone of this `Suite`.
     *
     * @return {Suite}
     * @api private
     */

    Suite.prototype.clone = function () {
      const suite = new Suite(this.title);
      debug('clone');
      suite.ctx = this.ctx;
      suite.timeout(this.timeout());
      suite.slow(this.slow());
      suite.bail(this.bail());
      return suite;
    };

    /**
     * Set timeout `ms` or short-hand such as "2s".
     *
     * @param {Number|String} ms
     * @return {Suite|Number} for chaining
     * @api private
     */

    Suite.prototype.timeout = function (ms) {
      if (arguments.length == 0) return this._timeout;
      if (typeof ms === 'string') ms = milliseconds(ms);
      debug('timeout %d', ms);
      this._timeout = parseInt(ms, 10);
      return this;
    };

    /**
     * Set slow `ms` or short-hand such as "2s".
     *
     * @param {Number|String} ms
     * @return {Suite|Number} for chaining
     * @api private
     */

    Suite.prototype.slow = function (ms) {
      if (arguments.length === 0) return this._slow;
      if (typeof ms === 'string') ms = milliseconds(ms);
      debug('slow %d', ms);
      this._slow = ms;
      return this;
    };

    /**
     * Sets whether to bail after first error.
     *
     * @parma {Boolean} bail
     * @return {Suite|Number} for chaining
     * @api private
     */

    Suite.prototype.bail = function (bail) {
      if (arguments.length == 0) return this._bail;
      debug('bail %s', bail);
      this._bail = bail;
      return this;
    };

    /**
     * Run `fn(test[, done])` before running tests.
     *
     * @param {Function} fn
     * @return {Suite} for chaining
     * @api private
     */

    Suite.prototype.beforeAll = function (fn) {
      if (this.pending) return this;
      const hook = new Hook('"before all" hook', fn);
      hook.parent = this;
      hook.timeout(this.timeout());
      hook.slow(this.slow());
      hook.ctx = this.ctx;
      this._beforeAll.push(hook);
      this.emit('beforeAll', hook);
      return this;
    };

    /**
     * Run `fn(test[, done])` after running tests.
     *
     * @param {Function} fn
     * @return {Suite} for chaining
     * @api private
     */

    Suite.prototype.afterAll = function (fn) {
      if (this.pending) return this;
      const hook = new Hook('"after all" hook', fn);
      hook.parent = this;
      hook.timeout(this.timeout());
      hook.slow(this.slow());
      hook.ctx = this.ctx;
      this._afterAll.push(hook);
      this.emit('afterAll', hook);
      return this;
    };

    /**
     * Run `fn(test[, done])` before each test case.
     *
     * @param {Function} fn
     * @return {Suite} for chaining
     * @api private
     */

    Suite.prototype.beforeEach = function (fn) {
      if (this.pending) return this;
      const hook = new Hook('"before each" hook', fn);
      hook.parent = this;
      hook.timeout(this.timeout());
      hook.slow(this.slow());
      hook.ctx = this.ctx;
      this._beforeEach.push(hook);
      this.emit('beforeEach', hook);
      return this;
    };

    /**
     * Run `fn(test[, done])` after each test case.
     *
     * @param {Function} fn
     * @return {Suite} for chaining
     * @api private
     */

    Suite.prototype.afterEach = function (fn) {
      if (this.pending) return this;
      const hook = new Hook('"after each" hook', fn);
      hook.parent = this;
      hook.timeout(this.timeout());
      hook.slow(this.slow());
      hook.ctx = this.ctx;
      this._afterEach.push(hook);
      this.emit('afterEach', hook);
      return this;
    };

    /**
     * Add a test `suite`.
     *
     * @param {Suite} suite
     * @return {Suite} for chaining
     * @api private
     */

    Suite.prototype.addSuite = function (suite) {
      suite.parent = this;
      suite.timeout(this.timeout());
      suite.slow(this.slow());
      suite.bail(this.bail());
      this.suites.push(suite);
      this.emit('suite', suite);
      return this;
    };

    /**
     * Add a `test` to this suite.
     *
     * @param {Test} test
     * @return {Suite} for chaining
     * @api private
     */

    Suite.prototype.addTest = function (test) {
      test.parent = this;
      test.timeout(this.timeout());
      test.slow(this.slow());
      test.ctx = this.ctx;
      this.tests.push(test);
      this.emit('test', test);
      return this;
    };

    /**
     * Return the full title generated by recursively
     * concatenating the parent's full title.
     *
     * @return {String}
     * @api public
     */

    Suite.prototype.fullTitle = function () {
      if (this.parent) {
        const full = this.parent.fullTitle();
        if (full) return `${full } ${ this.title}`;
      }
      return this.title;
    };

    /**
     * Return the total number of tests.
     *
     * @return {Number}
     * @api public
     */

    Suite.prototype.total = function () {
      return utils.reduce(this.suites, (sum, suite) => sum + suite.total(), 0) + this.tests.length;
    };

    /**
     * Iterates through each suite recursively to find
     * all tests. Applies a function in the format
     * `fn(test)`.
     *
     * @param {Function} fn
     * @return {Suite}
     * @api private
     */

    Suite.prototype.eachTest = function (fn) {
      utils.forEach(this.tests, fn);
      utils.forEach(this.suites, (suite) => {
        suite.eachTest(fn);
      });
      return this;
    };
  }); // module: suite.js

  require.register('test.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const Runnable = require('./runnable');

    /**
     * Expose `Test`.
     */

    module.exports = Test;

    /**
     * Initialize a new `Test` with the given `title` and callback `fn`.
     *
     * @param {String} title
     * @param {Function} fn
     * @api private
     */

    function Test(title, fn) {
      Runnable.call(this, title, fn);
      this.pending = !fn;
      this.type = 'test';
    }

    /**
     * Inherit from `Runnable.prototype`.
     */

    function F() {
    }
    F.prototype = Runnable.prototype;
    Test.prototype = new F();
    Test.prototype.constructor = Test;
  }); // module: test.js

  require.register('utils.js', (module, exports, require) => {
    /**
     * Module dependencies.
     */

    const fs = require('browser/fs'),
       path = require('browser/path'),
       {join} = path,
       debug = require('browser/debug')('mocha:watch');

    /**
     * Ignored directories.
     */

    const ignore = ['node_modules', '.git'];

    /**
     * Escape special characters in the given string of html.
     *
     * @param  {String} html
     * @return {String}
     * @api private
     */

    exports.escape = function (html) {
      return String(html)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    /**
     * Array#forEach (<=IE8)
     *
     * @param {Array} array
     * @param {Function} fn
     * @param {Object} scope
     * @api private
     */

    exports.forEach = function (arr, fn, scope) {
      for (let i = 0, l = arr.length; i < l; i++) { fn.call(scope, arr[i], i); }
    };

    /**
     * Array#indexOf (<=IE8)
     *
     * @parma {Array} arr
     * @param {Object} obj to find index of
     * @param {Number} start
     * @api private
     */

    exports.indexOf = function (arr, obj, start) {
      for (let i = start || 0, l = arr.length; i < l; i++) {
        if (arr[i] === obj) { return i; }
      }
      return -1;
    };

    /**
     * Array#reduce (<=IE8)
     *
     * @param {Array} array
     * @param {Function} fn
     * @param {Object} initial value
     * @api private
     */

    exports.reduce = function (arr, fn, val) {
      let rval = val;

      for (let i = 0, l = arr.length; i < l; i++) {
        rval = fn(rval, arr[i], i, arr);
      }

      return rval;
    };

    /**
     * Array#filter (<=IE8)
     *
     * @param {Array} array
     * @param {Function} fn
     * @api private
     */

    exports.filter = function (arr, fn) {
      const ret = [];

      for (let i = 0, l = arr.length; i < l; i++) {
        const val = arr[i];
        if (fn(val, i, arr)) ret.push(val);
      }

      return ret;
    };

    /**
     * Object.keys (<=IE8)
     *
     * @param {Object} obj
     * @return {Array} keys
     * @api private
     */

    exports.keys = Object.keys || function (obj) {
      const keys = [],
         has = Object.prototype.hasOwnProperty; // for `window` on <=IE8

      for (const key in obj) {
        if (has.call(obj, key)) {
          keys.push(key);
        }
      }

      return keys;
    };

    /**
     * Watch the given `files` for changes
     * and invoke `fn(file)` on modification.
     *
     * @param {Array} files
     * @param {Function} fn
     * @api private
     */

    exports.watch = function (files, fn) {
      const options = { interval: 100 };
      files.forEach((file) => {
        debug('file %s', file);
        fs.watchFile(file, options, (curr, prev) => {
          if (prev.mtime < curr.mtime) fn(file);
        });
      });
    };

    /**
     * Ignored files.
     */

    function ignored(path) {
      return !~ignore.indexOf(path);
    }

    /**
     * Lookup files in the given `dir`.
     *
     * @return {Array}
     * @api private
     */

    exports.files = function (dir, ret) {
      ret = ret || [];

      fs.readdirSync(dir)
        .filter(ignored)
        .forEach((path) => {
          path = join(dir, path);
          if (fs.statSync(path).isDirectory()) {
            exports.files(path, ret);
          } else if (path.match(/\.(js|coffee)$/)) {
            ret.push(path);
          }
        });

      return ret;
    };

    /**
     * Compute a slug from the given `str`.
     *
     * @param {String} str
     * @return {String}
     * @api private
     */

    exports.slug = function (str) {
      return str
        .toLowerCase()
        .replace(/ +/g, '-')
        .replace(/[^-\w]/g, '');
    };

    /**
     * Strip the function definition from `str`,
     * and re-indent for pre whitespace.
     */

    exports.clean = function (str) {
      str = str
        .replace(/^function *\(.*\) *{/, '')
        .replace(/\s+\}$/, '');

      const spaces = str.match(/^\n?( *)/)[1].length,
         re = new RegExp('^ {' + spaces + '}', 'gm');

      str = str.replace(re, '');

      return exports.trim(str);
    };

    /**
     * Escape regular expression characters in `str`.
     *
     * @param {String} str
     * @return {String}
     * @api private
     */

    exports.escapeRegexp = function (str) {
      return str.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    /**
     * Trim the given `str`.
     *
     * @param {String} str
     * @return {String}
     * @api private
     */

    exports.trim = function (str) {
      return str.replace(/^\s+|\s+$/g, '');
    };

    /**
     * Parse the given `qs`.
     *
     * @param {String} qs
     * @return {Object}
     * @api private
     */

    exports.parseQuery = function (qs) {
      return exports.reduce(qs.replace('?', '').split('&'), (obj, pair) => {
        let i = pair.indexOf('=');
           let key = pair.slice(0, i);
           let val = pair.slice(++i);

        obj[key] = decodeURIComponent(val);
        return obj;
      }, {});
    };

    /**
     * Highlight the given string of `js`.
     *
     * @param {String} js
     * @return {String}
     * @api private
     */

    function highlight(js) {
      return js
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\/\/(.*)/gm, '<span class="comment">//$1</span>')
        .replace(/('.*?')/gm, '<span class="string">$1</span>')
        .replace(/(\d+\.\d+)/gm, '<span class="number">$1</span>')
        .replace(/(\d+)/gm, '<span class="number">$1</span>')
        .replace(/\bnew *(\w+)/gm, '<span class="keyword">new</span> <span class="init">$1</span>')
        .replace(/\b(function|new|throw|return|var|if|else)\b/gm, '<span class="keyword">$1</span>');
    }

    /**
     * Highlight the contents of tag `name`.
     *
     * @param {String} name
     * @api private
     */

    exports.highlightTags = function (name) {
      const code = document.getElementsByTagName(name);
      for (let i = 0, len = code.length; i < len; ++i) {
        code[i].innerHTML = highlight(code[i].innerHTML);
      }
    };
  }); // module: utils.js
  /**
   * Node shims.
   *
   * These are meant only to allow
   * mocha.js to run untouched, not
   * to allow running node code in
   * the browser.
   */

  process = {};
  process.exit = function (status) {
  };
  process.stdout = {};
  global = window;

  /**
   * next tick implementation.
   */

  process.nextTick = (function () {
    // postMessage behaves badly on IE8
    if (window.ActiveXObject || !window.postMessage) {
      return function (fn) {
        fn();
      };
    }

    // based on setZeroTimeout by David Baron
    // - http://dbaron.org/log/20100309-faster-timeouts
    const timeouts = [],
       name = 'mocha-zero-timeout';

    window.addEventListener('message', (e) => {
      if (e.source == window && e.data == name) {
        if (e.stopPropagation) e.stopPropagation();
        if (timeouts.length) timeouts.shift()();
      }
    }, true);

    return function (fn) {
      timeouts.push(fn);
      window.postMessage(name, '*');
    };
  }());

  /**
   * Remove uncaughtException listener.
   */

  process.removeListener = function (e) {
    if (e == 'uncaughtException') {
      window.onerror = null;
    }
  };

  /**
   * Implements uncaughtException listener.
   */

  process.on = function (e, fn) {
    if (e == 'uncaughtException') {
      window.onerror = function (err, url, line) {
        fn(new Error(`${err } (${ url }:${ line })`));
      };
    }
  };

  // boot
  (function () {
    /**
     * Expose mocha.
     */

    const Mocha = window.Mocha = require('refactor/tests/libs/mocha');
    var mocha = window.mocha = new Mocha({ reporter: 'html' });

    /**
     * Override ui to ensure that the ui functions are initialized.
     * Normally this would happen in Mocha.prototype.loadFiles.
     */

    mocha.ui = function (ui) {
      Mocha.prototype.ui.call(this, ui);
      this.suite.emit('pre-require', window, null, this);
      return this;
    };

    /**
     * Setup mocha with the given setting options.
     */

    mocha.setup = function (opts) {
      if (typeof opts === 'string') opts = { ui: opts };
      for (const opt in opts) this[opt](opts[opt]);
      return this;
    };

    /**
     * Run mocha, returning the Runner.
     */

    mocha.run = function (fn) {
      const {options} = mocha;
      mocha.globals('location');

      const query = Mocha.utils.parseQuery(window.location.search || '');
      if (query.grep) mocha.grep(query.grep);
      if (query.invert) mocha.invert();

      return Mocha.prototype.run.call(mocha, () => {
        Mocha.utils.highlightTags('code');
        if (fn) fn();
      });
    };
  }());
}());

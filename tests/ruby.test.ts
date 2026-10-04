import assert from "node:assert/strict";
import test from "node:test";
import {
  createRubyMarkup,
  escapeHtml,
  isEnglishWord,
  normalizeAnnotation
} from "../src/ruby";

test("validates ordinary and hyphenated English words", () => {
  assert.equal(isEnglishWord("hello"), true);
  assert.equal(isEnglishWord("well-known"), true);
  assert.equal(isEnglishWord("don't"), true);
  assert.equal(isEnglishWord("two words"), false);
  assert.equal(isEnglishWord("中文"), false);
});

test("escapes markup before inserting ruby HTML", () => {
  assert.equal(escapeHtml("a&<b>"), "a&amp;&lt;b&gt;");
  assert.equal(
    createRubyMarkup("word", "词语&释义"),
    '<ruby class="ruby-translator-over">word<rt>词语&amp;释义</rt></ruby>'
  );
  assert.equal(
    createRubyMarkup("a phrase", "一个短语", "under"),
    '<ruby class="ruby-translator-under">a phrase<rt>一个短语</rt></ruby>'
  );
});

test("normalizes terse translation output", () => {
  assert.equal(normalizeAnnotation(' “示例。” '), "示例");
  assert.equal(normalizeAnnotation(' “这是示例。” ', false), "这是示例。");
  assert.equal(normalizeAnnotation("a   sample"), "a sample");
});

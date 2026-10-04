import assert from "node:assert/strict";
import test from "node:test";
import {
  SUMMARY_END,
  SUMMARY_START,
  buildSummary,
  extractAnnotations,
  planSummaryUpdate
} from "../src/summary";

test("extracts and deduplicates word, phrase, and sentence annotations", () => {
  const content = [
    '<ruby class="ruby-translator-over">signal<rt>信号</rt></ruby>',
    '<ruby class="ruby-translator-under">in context<rt>在语境中</rt></ruby>',
    '<ruby class="ruby-translator-over">signal<rt>信号</rt></ruby>',
    '<ruby>This works.<rt>这很有效。</rt></ruby>'
  ].join("\n");

  assert.deepEqual(extractAnnotations(content), [
    { source: "signal", translation: "信号" },
    { source: "in context", translation: "在语境中" },
    { source: "This works.", translation: "这很有效。" }
  ]);
});

test("appends a marked summary at the end", () => {
  const content = 'Text <ruby class="ruby-translator-over">word<rt>单词</rt></ruby>.';
  const update = planSummaryUpdate(content);
  assert.ok(update);
  assert.equal(update.start, content.length);
  assert.match(update.replacement, new RegExp(SUMMARY_START));
  assert.match(update.replacement, /\*\*word\*\*：单词/);
  assert.match(update.replacement, new RegExp(SUMMARY_END));
});

test("updates an existing summary without duplicating it", () => {
  const first = '<ruby class="ruby-translator-over">one<rt>一</rt></ruby>';
  const oldSummary = buildSummary([{ source: "old", translation: "旧" }]);
  const content = `${first}\n\n${oldSummary}`;
  const update = planSummaryUpdate(content);
  assert.ok(update);
  const next = content.slice(0, update.start) + update.replacement + content.slice(update.end);
  assert.equal(next.match(/ruby-translator-summary:start/g)?.length, 1);
  assert.match(next, /\*\*one\*\*：一/);
  assert.doesNotMatch(next, /\*\*old\*\*/);
});

test("removes a stale summary when no annotations remain", () => {
  const content = `Plain text\n\n${buildSummary([{ source: "old", translation: "旧" }])}`;
  const update = planSummaryUpdate(content);
  assert.ok(update);
  assert.equal(update.replacement, "");
});

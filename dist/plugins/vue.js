import { scriptRules, roleRisk } from "./javascript.js";
import { lineRule } from "./types.js";
const vueRules = [
    lineRule({
        id: 'vue/v-html',
        title: 'v-html renders raw HTML',
        severity: 'major',
        category: 'security',
        pattern: /\bv-html\s*=/,
        detail: 'v-html skips Vue\'s escaping, so any user content in it can run scripts. Render text, or sanitise the HTML (e.g. with DOMPurify) first.'
    }),
    lineRule({
        id: 'vue/v-for-key',
        title: 'v-for without a key',
        severity: 'minor',
        category: 'bug',
        pattern: /\bv-for\s*=/,
        unless: /:key\s*=|v-bind:key/,
        detail: 'Without a :key Vue reuses elements by position, so component state and inputs can end up on the wrong item when the list changes.'
    }),
    lineRule({
        id: 'vue/v-if-with-v-for',
        title: 'v-if and v-for on one element',
        severity: 'minor',
        category: 'performance',
        pattern: /\bv-for\s*=.*\bv-if\s*=|\bv-if\s*=.*\bv-for\s*=/,
        detail: 'In Vue 3 v-if runs first and cannot see the loop variable. Filter the list in a computed, or move v-if to a <template> wrapper.'
    }),
    lineRule({
        id: 'vue/mutate-prop',
        title: 'Prop changed in the child',
        severity: 'major',
        category: 'bug',
        pattern: /\bprops\.\w+(\.\w+)*\s*(=|\+=|-=|\+\+|--)(?!=)/,
        detail: 'Props belong to the parent. Changing one here is overwritten on the next render. Emit an event, or use defineModel.'
    }),
    lineRule({
        id: 'vue/img-alt',
        title: 'Image without alt text',
        severity: 'minor',
        category: 'accessibility',
        pattern: /<(img|NuxtImg|NuxtPicture)\b(?![^>]*\balt=)[^>]*\/?>/,
        detail: 'Screen readers need alt text. Use alt="" for decorative images.'
    }),
    lineRule({
        id: 'vue/click-on-div',
        title: 'Click handler on a non-button',
        severity: 'minor',
        category: 'accessibility',
        pattern: /<(div|span|li)\b[^>]*@click/,
        unless: /role=|tabindex/,
        detail: 'Keyboard users cannot reach or press this. Use a <button>, or add role="button", tabindex="0" and a key handler.'
    }),
    lineRule({
        id: 'vue/reactive-destructure',
        title: 'Destructuring loses reactivity',
        severity: 'major',
        category: 'bug',
        pattern: /const\s*\{[^}]+\}\s*=\s*(reactive\(|props\b|useStore\(|use\w+Store\(\))/,
        unless: /toRefs|storeToRefs|defineProps/,
        detail: 'Values destructured from a reactive object are plain copies and stop updating. Use toRefs() or storeToRefs(), or read them through the object.'
    })
];
export const vue = {
    name: 'vue',
    kind: 'language',
    label: 'Vue',
    color: '#41b883',
    extensions: ['.vue'],
    classify: (p) => (/(^|\/)(pages|views)\//.test(p) ? 'Page' : /(^|\/)layouts\//.test(p) ? 'Layout' : 'Vue component'),
    roleRisk,
    rules: [...scriptRules, ...vueRules],
    guidance: 'Reactivity loss (destructuring, replacing reactive objects), props mutation, missing keys, watchers that leak or fire too often, v-html, accessibility of interactive elements, and work done in setup that should wait for onMounted.'
};

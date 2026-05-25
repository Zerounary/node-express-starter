<template>
  <div v-if="editor" class="rich-text-editor">
    <div class="toolbar">
      <button @click="editor.chain().focus().toggleBold().run()" :disabled="!editor.can().chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }">
        Bold
      </button>
      <button @click="editor.chain().focus().toggleItalic().run()" :disabled="!editor.can().chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }">
        Italic
      </button>
      <button @click="editor.chain().focus().toggleStrike().run()" :disabled="!editor.can().chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }">
        Strike
      </button>
      <button @click="editor.chain().focus().setParagraph().run()" :class="{ 'is-active': editor.isActive('paragraph') }">
        Paragraph
      </button>
      <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }">
        H1
      </button>
      <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }">
        H2
      </button>
      <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }">
        Bullet List
      </button>
      <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }">
        Ordered List
      </button>
    </div>
    <editor-content :editor="editor" />
  </div>
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { watch, defineModel } from 'vue'

const modelValue = defineModel({
  type: String,
  default: '',
})

const editor = useEditor({
  content: modelValue.value,
  extensions: [
    StarterKit,
  ],
  onUpdate: ({ editor }) => {
    modelValue.value = editor.getHTML()
  },
})

watch(modelValue, (value) => {
  const isSame = editor.value.getHTML() === value

  if (isSame) {
    return
  }

  editor.value.commands.setContent(value, false)
})
</script>

<style>
.rich-text-editor {
  border: 1px solid #ccc;
  border-radius: 4px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  padding: 8px;
  border-bottom: 1px solid #ccc;
  background-color: #f5f5f5;
}

.toolbar button {
  margin-right: 4px;
  margin-bottom: 4px;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.toolbar button.is-active {
  background-color: #e0e0e0;
  font-weight: bold;
}

.ProseMirror {
  padding: 8px;
  min-height: 200px;
  outline: none;
}
</style>
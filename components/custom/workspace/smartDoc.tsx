"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  Heading1,
  Heading2,
} from "lucide-react";

interface SmartDocProps {
  initialContent: string;
  onChange: (content: string) => void;
}

export default function SmartDoc({
  initialContent,
  onChange,
}: SmartDocProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (!editorRef.current || initializedRef.current) return;

    editorRef.current.innerText = initialContent || "";

    initializedRef.current = true;

    updateWordCount(initialContent || "");
  }, [initialContent]);

  const updateWordCount = (text: string) => {
    const trimmed = text.trim();

    setWordCount(
      trimmed ? trimmed.split(/\s+/).length : 0
    );
  };

  const handleInput = () => {
    const editor = editorRef.current;

    if (!editor) return;

    const content = editor.innerText;

    updateWordCount(content);

    onChange(content);
  };

  const applyFormat = (command: string) => {
    editorRef.current?.focus();

    document.execCommand(command, false);

    if (editorRef.current) {
      onChange(editorRef.current.innerText);
    }
  };

  const toolbarButton =
    "flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100";

  return (
    <section className="flex h-full min-h-0 flex-col bg-gray-50">
      {/* Document Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-gray-200 bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => applyFormat("bold")}
          className={toolbarButton}
          aria-label="Bold"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("italic")}
          className={toolbarButton}
          aria-label="Italic"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("underline")}
          className={toolbarButton}
          aria-label="Underline"
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>

        <span className="mx-2 h-6 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => applyFormat("formatBlock: h1")}
          className={toolbarButton}
          aria-label="Heading 1"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("formatBlock: h2")}
          className={toolbarButton}
          aria-label="Heading 2"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <span className="mx-2 h-6 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => applyFormat("insertUnorderedList")}
          className={toolbarButton}
          aria-label="Bulleted list"
          title="Bulleted list"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("insertOrderedList")}
          className={toolbarButton}
          aria-label="Numbered list"
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <span className="mx-2 h-6 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => applyFormat("justifyLeft")}
          className={toolbarButton}
          aria-label="Align left"
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("justifyCenter")}
          className={toolbarButton}
          aria-label="Align center"
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>

        <span className="ml-auto text-xs text-gray-400">
          {wordCount} words
        </span>
      </div>

      {/* Document Canvas */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-4 py-8 sm:px-8">
        <div className="mx-auto min-h-[700px] w-full max-w-4xl rounded-sm border border-gray-200 bg-white px-6 py-10 shadow-sm sm:px-14 sm:py-14">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Document editor"
            aria-multiline="true"
            onInput={handleInput}
            data-placeholder="Start writing your ideas..."
            className="min-h-[580px] w-full whitespace-pre-wrap break-words text-base leading-8 text-gray-800 outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
          />
        </div>
      </div>
    </section>
  );
}
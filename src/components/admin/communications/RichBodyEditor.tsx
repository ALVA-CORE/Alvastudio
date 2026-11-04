import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextBold from "@solar-icons/react/text-formatting/TextBold";
import TextItalic from "@solar-icons/react/text-formatting/TextItalic";
import LinkMinimalistic from "@solar-icons/react/text-formatting/LinkMinimalistic";
import List from "@solar-icons/react/list/List";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { safeHref } from "@/lib/admin/richBody";
import { cn } from "@/lib/utils";

/**
 * The email body, with formatting: bold, italic, bullets, numbers and links.
 *
 * Only what the email can carry is in the schema. Headings, code, quotes and
 * the rest are switched off, so pasting from a document brings its words and
 * nothing the template would have to guess at. Links are HTTPS only, the
 * rule the API holds the button to.
 */
export function RichBodyEditor({
  value,
  onChange,
}: {
  value: JSONContent | null;
  onChange: (doc: JSONContent) => void;
}) {
  const [linking, setLinking] = useState(false);
  const [href, setHref] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["https"],
          isAllowedUri: (url) => Boolean(safeHref(url)),
        },
      }),
    ],
    content: value ?? "",
    editorProps: {
      attributes: {
        "aria-label": "Body",
        role: "textbox",
        "aria-multiline": "true",
        class:
          "comms-body min-h-[9rem] px-3.5 py-3 text-sm leading-relaxed text-foreground focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
  });

  /* After a send the composer starts over; the editor follows. */
  useEffect(() => {
    if (editor && value === null && !editor.isEmpty) editor.commands.clearContent();
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      bullet: current?.isActive("bulletList") ?? false,
      ordered: current?.isActive("orderedList") ?? false,
      link: current?.isActive("link") ?? false,
      empty: current?.isEmpty ?? true,
    }),
  });

  const openLink = () => {
    if (!editor) return;
    setHref(String(editor.getAttributes("link").href ?? ""));
    setLinking(true);
    requestAnimationFrame(() => linkInput.current?.focus());
  };

  const applyLink = () => {
    if (!editor) return;
    const chain = editor.chain().focus().extendMarkRange("link");
    const value = href.trim();
    if (!value) {
      chain.unsetLink().run();
    } else {
      const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      const safe = safeHref(withScheme);
      if (!safe) return;
      if (editor.state.selection.empty && !state?.link) {
        chain.insertContent({ type: "text", text: value, marks: [{ type: "link", attrs: { href: safe } }] }).run();
      } else {
        chain.setLink({ href: safe }).run();
      }
    }
    setLinking(false);
    setHref("");
  };

  const tools = [
    { label: "Bold", active: state?.bold, run: () => editor?.chain().focus().toggleBold().run(), icon: <TextBold size={16} weight="Bold" /> },
    { label: "Italic", active: state?.italic, run: () => editor?.chain().focus().toggleItalic().run(), icon: <TextItalic size={16} weight="Bold" /> },
    { label: "Bullets", active: state?.bullet, run: () => editor?.chain().focus().toggleBulletList().run(), icon: <List size={16} weight="Bold" /> },
    {
      label: "Numbers",
      active: state?.ordered,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
      icon: <span className="text-[11px] font-bold leading-none">1.</span>,
    },
    { label: "Link", active: state?.link || linking, run: openLink, icon: <LinkMinimalistic size={16} weight="Bold" /> },
  ];

  return (
    /* The same focus beam as every other field, not a border of its own. */
    <FieldBeam>
    <div className="overflow-hidden rounded-xl border border-alva-border bg-alva-surface">
      <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 border-b border-alva-border/70 px-1.5 py-1">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            aria-label={tool.label}
            aria-pressed={Boolean(tool.active)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={tool.run}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-alva-card hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
              tool.active && "bg-alva-card text-alva-accent"
            )}
          >
            {tool.icon}
          </button>
        ))}

        <AnimatePresence initial={false}>
          {linking ? (
            <motion.form
              key="link"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              onSubmit={(event) => {
                event.preventDefault();
                applyLink();
              }}
              className="ml-1 flex min-w-0 flex-1 overflow-hidden"
            >
              <FieldBeam radius={8} className="rounded-lg">
              <input
                ref={linkInput}
                value={href}
                onChange={(event) => setHref(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setLinking(false);
                    editor?.commands.focus();
                  }
                }}
                onBlur={() => applyLink()}
                placeholder="https://"
                aria-label="Link address"
                inputMode="url"
                className="h-7 w-full min-w-0 rounded-lg bg-alva-card px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
              />
              </FieldBeam>
            </motion.form>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="relative">
        {state?.empty ? (
          <span className="pointer-events-none absolute left-3.5 top-3 text-sm text-muted-foreground">
            Body
          </span>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
    </FieldBeam>
  );
}

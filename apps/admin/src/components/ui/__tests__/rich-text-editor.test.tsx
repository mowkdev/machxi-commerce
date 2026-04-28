// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RichTextEditor } from '../rich-text-editor';

function getEditorEl(container: HTMLElement) {
  return container.querySelector('.tiptap.ProseMirror') as HTMLElement;
}

describe('RichTextEditor', () => {
  it('renders the editor area and toolbar', () => {
    const { container } = render(<RichTextEditor />);
    const editor = getEditorEl(container);
    expect(editor).toBeTruthy();
    expect(editor.getAttribute('contenteditable')).toBe('true');
    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Strikethrough')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument();
    expect(screen.getByLabelText('Ordered list')).toBeInTheDocument();
    expect(screen.getByLabelText('Blockquote')).toBeInTheDocument();
    expect(screen.getByLabelText('Code block')).toBeInTheDocument();
    expect(screen.getByLabelText('Undo')).toBeInTheDocument();
    expect(screen.getByLabelText('Redo')).toBeInTheDocument();
  });

  it('renders with initial HTML value', async () => {
    const { container } = render(
      <RichTextEditor value="<p>Hello <strong>world</strong></p>" />,
    );
    await waitFor(() => {
      const editor = getEditorEl(container);
      expect(editor.innerHTML).toContain('Hello');
      expect(editor.innerHTML).toContain('<strong>world</strong>');
    });
  });

  it('syncs when value prop changes externally', async () => {
    const { container, rerender } = render(
      <RichTextEditor value="<p>Initial</p>" />,
    );
    await waitFor(() => {
      expect(getEditorEl(container).innerHTML).toContain('Initial');
    });

    rerender(<RichTextEditor value="<p>Updated content</p>" />);
    await waitFor(() => {
      expect(getEditorEl(container).innerHTML).toContain('Updated content');
      expect(getEditorEl(container).innerHTML).not.toContain('Initial');
    });
  });

  it('renders empty editor when value is empty string', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalledWith('<p></p>');
  });

  it('renders with complex HTML content', async () => {
    const html = '<h2>Title</h2><ul><li>Item 1</li><li>Item 2</li></ul><p>Paragraph</p>';
    const { container } = render(<RichTextEditor value={html} />);
    await waitFor(() => {
      const editor = getEditorEl(container);
      expect(editor.innerHTML).toContain('Title');
      expect(editor.innerHTML).toContain('Item 1');
      expect(editor.innerHTML).toContain('Paragraph');
    });
  });

  it('accepts custom placeholder text', () => {
    const { container } = render(
      <RichTextEditor placeholder="Enter description..." />,
    );
    const emptyP = container.querySelector('[data-placeholder]');
    expect(emptyP?.getAttribute('data-placeholder')).toBe(
      'Enter description...',
    );
  });

  it('applies custom className', () => {
    const { container } = render(
      <RichTextEditor className="my-custom-class" />,
    );
    const wrapper = container.querySelector('.rich-text-editor');
    expect(wrapper?.classList.contains('my-custom-class')).toBe(true);
  });
});

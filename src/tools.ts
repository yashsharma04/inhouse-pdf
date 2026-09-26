export interface Faq {
  question: string;
  answer: string;
}

export interface Tool {
  slug: string;
  name: string;
  /** One line used on cards and in links. */
  summary: string;
  title: string;
  description: string;
  heading: string;
  promise: string;
  steps: [string, string, string];
  faqs: Faq[];
}

const privacyFaq: Faq = {
  question: 'Are my files uploaded anywhere?',
  answer:
    'No. Your PDF is processed by your own browser and never leaves your device. The site also sends a security policy that tells your browser to block uploads to any server, so this is enforced, not just promised.',
};

const freeFaq: Faq = {
  question: 'Is it free?',
  answer: 'Yes. No account, no watermark, no daily limits.',
};

const sizeFaq: Faq = {
  question: 'Is there a file size limit?',
  answer:
    "There's no fixed limit. Because everything runs on your device, very large files depend on your device's memory. Files of a few hundred megabytes work on most laptops.",
};

export const tools = {
  merge: {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    summary: 'Combine several PDFs into one file.',
    title: 'Merge PDF files privately, in your browser',
    description:
      'Combine PDF files into one, in the order you choose. Free, no sign-up, and your files never leave your device.',
    heading: 'Merge PDF files',
    promise: 'Combine PDFs into one file. Nothing is uploaded.',
    steps: [
      'Drop two or more PDFs onto the page.',
      'Drag them into the order you want.',
      'Click Merge and download your new PDF.',
    ],
    faqs: [
      privacyFaq,
      {
        question: 'Can I change the order of the files?',
        answer: 'Yes. Drag files by their handle or use the arrow buttons. The merged PDF follows the order on screen.',
      },
      freeFaq,
      sizeFaq,
    ],
  },
  split: {
    slug: 'split-pdf',
    name: 'Split PDF',
    summary: 'Extract pages or split every page into its own file.',
    title: 'Split PDF and extract pages privately, in your browser',
    description:
      'Extract pages from a PDF or split every page into a separate file. Free, no sign-up, and your file never leaves your device.',
    heading: 'Split a PDF',
    promise: 'Extract the pages you need. Nothing is uploaded.',
    steps: [
      'Drop a PDF onto the page.',
      'Type the pages you want, like 1-3, 5, or choose to split every page.',
      'Click Split and download the result.',
    ],
    faqs: [
      privacyFaq,
      {
        question: 'How do I choose pages?',
        answer:
          'Type page numbers and ranges separated by commas, for example 1-3, 5, 8-10. Pages come out in the order you type them.',
      },
      {
        question: 'What do I get when I split every page?',
        answer: 'A zip file with one PDF per page, named so they stay in order.',
      },
      freeFaq,
    ],
  },
  organize: {
    slug: 'organize-pdf',
    name: 'Organize PDF',
    summary: 'Reorder, rotate, and delete pages.',
    title: 'Reorder, rotate, and delete PDF pages privately, in your browser',
    description:
      'Rearrange PDF pages, rotate them, or delete the ones you don’t need. Free, no sign-up, and your file never leaves your device.',
    heading: 'Organize PDF pages',
    promise: 'Reorder, rotate, and delete pages. Nothing is uploaded.',
    steps: [
      'Drop a PDF onto the page to see every page.',
      'Drag pages to reorder them, rotate or delete the ones you need to.',
      'Click Save and download your updated PDF.',
    ],
    faqs: [
      privacyFaq,
      {
        question: 'Does rotating a page reduce its quality?',
        answer: 'No. Rotation only changes how the page is displayed. The content is kept exactly as it was.',
      },
      freeFaq,
      sizeFaq,
    ],
  },
  compress: {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    summary: 'Make a PDF smaller for email and uploads.',
    title: 'Compress PDF files privately, in your browser',
    description:
      'Reduce PDF file size with three quality levels. Free, no sign-up, and your file never leaves your device.',
    heading: 'Compress a PDF',
    promise: 'Make your PDF smaller. Nothing is uploaded.',
    steps: [
      'Drop a PDF onto the page.',
      'Pick a compression level. Recommended suits most files.',
      'Click Compress and download the smaller PDF.',
    ],
    faqs: [
      privacyFaq,
      {
        question: 'How much smaller will my PDF get?',
        answer:
          'It depends on the content. PDFs with photos or scans often shrink by 50–90%. PDFs that are mostly text are usually small already, and we’ll tell you if compressing wouldn’t help.',
      },
      {
        question: 'Will the text still be selectable?',
        answer: 'Yes. Compression mainly resamples images. Text stays sharp, selectable, and searchable.',
      },
      {
        question: 'Why does the first compression take longer?',
        answer:
          'The compression engine (Ghostscript) is downloaded once and then cached by your browser. After that it starts instantly.',
      },
      freeFaq,
    ],
  },
} satisfies Record<string, Tool>;

export const toolList: Tool[] = Object.values(tools);

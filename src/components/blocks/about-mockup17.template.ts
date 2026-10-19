export const aboutMockup17BlockSchema = {
  name: 'aboutMockup17',
  label: 'About Page Template Sections',
  fields: [
    { type: 'object', name: 'hero', label: 'Hero Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' },
      { name: 'headline', label: 'Headline', type: 'string' },
      { name: 'headlineAccent', label: 'Headline Accent', type: 'string' },
      { name: 'lede', label: 'Lede', type: 'string', ui: { component: 'textarea' } },
    ]},
    { type: 'object', name: 'broader', label: 'Broader View Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'title', label: 'Title', type: 'string' },
      { name: 'text', label: 'Text', type: 'string', ui: { component: 'textarea' } },
      { name: 'image', label: 'Image', type: 'image' }, { name: 'imageAlt', label: 'Image Alt Text', type: 'string' },
      { name: 'items', label: 'Context Cards', type: 'object', list: true, fields: [
        { name: 'label', label: 'Label', type: 'string' }, { name: 'title', label: 'Title', type: 'string' },
      ]},
    ]},
    { type: 'object', name: 'purpose', label: 'Our Purpose Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'title', label: 'Title', type: 'string' },
      { name: 'paragraphOne', label: 'Paragraph', type: 'string', ui: { component: 'textarea' } },
      { name: 'questionsTitle', label: 'Questions Title', type: 'string' },
      { name: 'questions', label: 'Questions', type: 'object', list: true, fields: [
        { name: 'number', label: 'Number', type: 'string' }, { name: 'text', label: 'Text', type: 'string' },
      ]},
    ]},
    { type: 'object', name: 'standardsSection', label: 'Standards Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'title', label: 'Title', type: 'string' },
      { name: 'intro', label: 'Intro', type: 'string', ui: { component: 'textarea' } },
      { name: 'note', label: 'Closing Note', type: 'string', ui: { component: 'textarea' } },
      { name: 'items', label: 'Standards', type: 'object', list: true, fields: [
        { name: 'number', label: 'Number', type: 'string' }, { name: 'title', label: 'Title', type: 'string' },
        { name: 'text', label: 'Text', type: 'string', ui: { component: 'textarea' } },
      ]},
    ]},
    { type: 'object', name: 'readers', label: 'Our Readers Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'title', label: 'Title', type: 'string' },
      { name: 'paragraphOne', label: 'Paragraph 1', type: 'string', ui: { component: 'textarea' } },
      { name: 'paragraphTwo', label: 'Paragraph 2', type: 'string', ui: { component: 'textarea' } },
      { name: 'image', label: 'Image', type: 'image' }, { name: 'imageAlt', label: 'Image Alt Text', type: 'string' },
    ]},
    { type: 'object', name: 'explore', label: 'Keep Exploring Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'title', label: 'Title', type: 'string' },
      { name: 'text', label: 'Text', type: 'string', ui: { component: 'textarea' } },
      { name: 'buttonText', label: 'Button Text', type: 'string' }, { name: 'buttonLink', label: 'Button Link', type: 'string' },
    ]},
  ],
};

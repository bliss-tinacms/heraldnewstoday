export const homepageTemplateBlockSchema = {
  name: 'homepageTemplate',
  label: 'Homepage Template Content',
  fields: [
    { type: 'object', name: 'hero', label: 'Hero Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' },
      { name: 'title', label: 'Headline', type: 'string' },
      { name: 'description', label: 'Description', type: 'string', ui: { component: 'textarea' } },
      { name: 'buttonText', label: 'Featured Story Label', type: 'string', description: 'Text label shown beside the hero eyebrow.' },
      { name: 'buttonLink', label: 'Unused Legacy Link', type: 'string', description: 'Kept for Tina Cloud schema compatibility.' },
      { name: 'image', label: 'Hero Image', type: 'image' },
      { name: 'imageAlt', label: 'Hero Image Alt Text', type: 'string' },
    ]},
    { type: 'object', name: 'why', label: 'Mission Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' },
      { name: 'title', label: 'Heading', type: 'string' },
      { name: 'paragraphOne', label: 'Paragraph 1', type: 'string', ui: { component: 'textarea' } },
      { name: 'paragraphTwo', label: 'Pullquote', type: 'string', ui: { component: 'textarea' } },
      { type: 'object', list: true, name: 'standards', label: 'Mission Cards', fields: [
        { name: 'label', label: 'Small Label', type: 'string' }, { name: 'title', label: 'Card Title', type: 'string' }, { name: 'text', label: 'Card Text', type: 'string', ui: { component: 'textarea' } },
      ]},
    ]},
    { type: 'object', name: 'newsroom', label: 'Featured Reporting Section', fields: [
      { name: 'heading', label: 'Heading', type: 'string' }, { name: 'subheading', label: 'Subheading', type: 'string' },
      { name: 'submitHeading', label: 'Legacy Submit Heading', type: 'string' }, { name: 'submitButtonText', label: 'Legacy Submit Button Text', type: 'string' }, { name: 'submitButtonLink', label: 'Legacy Submit Button Link', type: 'string' },
      { type: 'object', list: true, name: 'prompts', label: 'Legacy Prompt Items', fields: [{ name: 'title', label: 'Title', type: 'string' }, { name: 'text', label: 'Text', type: 'string', ui: { component: 'textarea' } }] },
    ]},
    { type: 'object', name: 'wireFeature', label: 'Editorial Commitment Feature', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'quote', label: 'Quote', type: 'string', ui: { component: 'textarea' } }, { name: 'author', label: 'Author Name', type: 'string' }, { name: 'byline', label: 'Byline', type: 'string' }, { name: 'image', label: 'Feature Image', type: 'image' }, { name: 'imageAlt', label: 'Feature Image Alt Text', type: 'string' },
    ]},
    { type: 'object', name: 'coverage', label: 'What We Cover Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'title', label: 'Heading', type: 'string' }, { name: 'description', label: 'Description', type: 'string', ui: { component: 'textarea' } },
      { name: 'figureImage', label: 'Feature Image', type: 'image' }, { name: 'figureAlt', label: 'Feature Image Alt Text', type: 'string' }, { name: 'figureTitle', label: 'Feature Caption Heading', type: 'string' }, { name: 'figureCaption', label: 'Feature Caption Text', type: 'string' },
      { type: 'object', list: true, name: 'topics', label: 'Coverage Topic Cards', fields: [
        { name: 'number', label: 'Number', type: 'string' }, { name: 'title', label: 'Topic Title', type: 'string' }, { name: 'text', label: 'Topic Text', type: 'string', ui: { component: 'textarea' } }, { name: 'link', label: 'Topic Link', type: 'string' }, { name: 'image', label: 'Topic Image', type: 'image' }, { name: 'imageAlt', label: 'Topic Image Alt Text', type: 'string' },
      ]},
    ]},
    { type: 'object', name: 'standardsSection', label: 'Editorial Standards Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'title', label: 'Heading', type: 'string' }, { name: 'documentTitle', label: 'Document Title', type: 'string' }, { name: 'documentSubtitle', label: 'Document Subtitle', type: 'string' },
      { type: 'object', list: true, name: 'items', label: 'Standards', fields: [{ name: 'title', label: 'Standard Name', type: 'string' }, { name: 'text', label: 'Standard Text', type: 'string', ui: { component: 'textarea' } }] },
      { name: 'signatory', label: 'Signatory', type: 'string' }, { name: 'revision', label: 'Revision Note', type: 'string' },
    ]},
    { type: 'object', name: 'team', label: 'Homepage Team Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'title', label: 'Heading', type: 'string' },
      { type: 'object', list: true, name: 'people', label: 'People', fields: [
        { name: 'name', label: 'Name', type: 'string' }, { name: 'role', label: 'Role', type: 'string' }, { name: 'bio', label: 'Short Bio', type: 'string', ui: { component: 'textarea' } }, { name: 'image', label: 'Photo', type: 'image' }, { name: 'imageAlt', label: 'Photo Alt Text', type: 'string' }, { name: 'link', label: 'Profile Link', type: 'string' },
      ]},
    ]},
    { type: 'object', name: 'contact', label: 'Legacy Contact Section', fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'string' }, { name: 'title', label: 'Heading', type: 'string' }, { name: 'description', label: 'Description', type: 'string', ui: { component: 'textarea' } }, { name: 'note', label: 'Note', type: 'string', ui: { component: 'textarea' } },
      { type: 'object', list: true, name: 'cards', label: 'Contact Cards', fields: [{ name: 'title', label: 'Card Title', type: 'string' }, { name: 'email', label: 'Email', type: 'string' }, { name: 'text', label: 'Card Text', type: 'string', ui: { component: 'textarea' } }, { name: 'accent', label: 'Accent Card', type: 'boolean' }] },
    ]},
  ],
};

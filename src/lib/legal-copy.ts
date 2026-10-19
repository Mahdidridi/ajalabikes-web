import type { Locale } from '@/lib/api';
import type { LegalPageKey } from '@/lib/legal';

/**
 * Les textes des pages légales, dans les deux langues, tels que relus par le fondateur (page de relecture du
 * 19 octobre 2026). Un texte se change ici et nulle part ailleurs ; le resoumettre au fondateur.
 *
 * Jetons remplacés au rendu (`src/components/LegalPage.tsx`) :
 * - `{email}` l'adresse de contact (lien), `{publisher}`, `{country}`, `{retention}`, `{law}` — les faits de
 *   `LEGAL_FACTS` (`src/lib/legal.ts`), marqués « à compléter » tant qu'ils manquent ;
 * - `{page:privacy}`, `{page:image-rights}` — un lien vers la page, son titre pour texte ;
 * - `{cookie:0}`, `{cookie:1}` — les noms des cookies de Google Analytics ; `{optout}` — le lien de désactivation.
 *
 * Les noms latins (« Darraja Bikes », « Google Analytics 4 », « Hetzner ») s'écrivent tels quels dans l'arabe : le rendu
 * les isole par `<bdi>` (`latinRuns`). Vocabulaire : « الدراجات الهوائية » au premier emploi, « دراجة » ensuite (décision
 * du 4 septembre 2026) ; le site se nomme « Darraja Bikes » dans les deux langues (nom de site unique).
 */
export type LegalBlock = { p: string } | { ul: string[] };
export type LegalSection = { title?: string; blocks: LegalBlock[] };
export type LegalPageCopy = { title: string; description: string; sections: LegalSection[] };

export const LEGAL_COPY: Record<LegalPageKey, Record<Locale, LegalPageCopy>> = {
  privacy: {
    'ar-sa': {
      title: 'سياسة الخصوصية',
      description:
        'كيف يتعامل Darraja Bikes مع بياناتك: لا حساب ولا نموذج تواصل، وقياس الزيارات عبر Google Analytics 4، وسجلات الخادم، وحقوقك.',
      sections: [
        {
          blocks: [
            {
              p: 'Darraja Bikes موقع معلومات يساعدك على اكتشاف الدراجات الهوائية ومقارنتها. يمكنك تصفّحه دون حساب، ودون تسجيل، ودون أن تعطينا أي معلومة شخصية.',
            },
          ],
        },
        {
          title: 'ما لا نجمعه',
          blocks: [
            {
              ul: [
                'لا حساب، ولا تسجيل، ولا نشرة بريدية.',
                'لا نموذج تواصل: إن راسلتنا، فبالبريد الإلكتروني.',
                'لا دفع: نحن لا نبيع شيئًا.',
              ],
            },
          ],
        },
        {
          title: 'قياس الزيارات (Google Analytics)',
          blocks: [
            {
              p: 'نستخدم Google Analytics 4 لعدّ الزيارات وفهم طريقة استخدام الموقع: الصفحات التي تُفتح، والبلد والمدينة التي تأتي منها الزيارة على وجه التقريب، ونوع الجهاز والمتصفح، والموقع الذي أحال الزائر إلينا. لا نستخدم هذه الأرقام إلا مجمّعةً، لتحسين الموقع.',
            },
            {
              p: 'يضع Google Analytics على جهازك ملفَّي تعريف ارتباط (كوكيز): {cookie:0} و{cookie:1}، ومدة كلٍّ منهما سنتان على الأكثر. وتستخدم Google عنوان IP الخاص بك لتقدير موقعك التقريبي (البلد والمنطقة والمدينة)، ولاكتشاف الزيارات غير المرغوب فيها واستبعادها؛ وتذكر أنها لا تربطه أبدًا بأي مُعرِّف، وأنها تتخلّص منه بعد استخدامه. وتعالج Google هذه البيانات، وقد يكون ذلك على خوادم خارج بلدك.',
            },
            {
              p: 'لرفض هذا القياس: احظر هذين الملفين أو احذفهما من إعدادات متصفحك، أو ثبّت إضافة الإلغاء التي توفّرها Google: {optout}.',
            },
          ],
        },
        {
          title: 'سجلات الخادم',
          blocks: [
            {
              // Relevé sur le serveur le 19 octobre 2026 : `access_log off` sur les deux sites (Forge) ; seules les erreurs
              // sont écrites, rotation quotidienne, 52 fichiers gardés (`/etc/logrotate.d/nginx`).
              p: 'لا يحتفظ خادمنا بسجلٍّ للزيارات. وعند حدوث خطأ، يسجّل سطرًا تقنيًا قد يتضمّن عنوان IP، والتاريخ والوقت، والصفحة المطلوبة. لا تُستخدم سجلات الأخطاء هذه إلا لإصلاح المشكلات، ولا نشاركها مع أحد، وتُحذف تلقائيًا بعد {retention}. الموقع مستضاف لدى Hetzner في ألمانيا.',
            },
          ],
        },
        {
          title: 'الرسائل',
          blocks: [{ p: 'إن راسلتنا، نحتفظ برسالتك وبعنوان بريدك الإلكتروني ما دام ذلك لازمًا للرد عليك فقط.' }],
        },
        {
          title: 'حقوقك',
          blocks: [
            {
              p: 'يمكنك أن تسألنا عن البيانات التي تخصّك، أو أن تطلب تصحيحها أو حذفها، بمراسلتنا على {email}. وبالنظر إلى ما نجمعه، فإننا لا نحتفظ عادةً بشيء يدلّ على هويتك، سوى الرسائل التي ترسلها إلينا.',
            },
          ],
        },
        {
          title: 'التحديثات',
          blocks: [{ p: 'نحدّث هذه الصفحة متى تغيّرت ممارساتنا.' }],
        },
      ],
    },
    'en-sa': {
      title: 'Privacy policy',
      description:
        'How Darraja Bikes handles your data: no account, no contact form, audience measurement with Google Analytics 4, server logs, and your rights.',
      sections: [
        {
          blocks: [
            {
              p: 'Darraja Bikes is an information site that helps you discover and compare bikes. You can browse it without an account, without signing up, and without giving us any personal information.',
            },
          ],
        },
        {
          title: 'What we do not collect',
          blocks: [
            {
              ul: [
                'No account, no sign-up, no newsletter.',
                'No contact form: if you write to us, you do it by email.',
                'No payment: we sell nothing.',
              ],
            },
          ],
        },
        {
          title: 'Audience measurement (Google Analytics)',
          blocks: [
            {
              p: 'We use Google Analytics 4 to count visits and understand how the site is used: the pages viewed, the approximate country and city a visit comes from, the type of device and browser, and the site that referred the visitor. We use these figures only in aggregate, to improve the site.',
            },
            {
              p: 'Google Analytics sets two cookies on your device: {cookie:0} and {cookie:1}, each lasting up to 2 years. Google uses your IP address to estimate your approximate location (country, region, city) and to filter out spam; Google states that it never associates it with an identifier and discards it after use. The data is processed by Google, possibly on servers outside your country.',
            },
            {
              p: "To refuse this measurement: block or delete these cookies in your browser settings, or install Google's opt-out add-on: {optout}.",
            },
          ],
        },
        {
          title: 'Server logs',
          blocks: [
            {
              p: 'Our server keeps no log of visits. When an error occurs, it records a technical line that may include the IP address, the date and time, and the page requested. These error logs are used only to fix problems, are not shared with anyone, and are deleted automatically after {retention}. The site is hosted by Hetzner, in Germany.',
            },
          ],
        },
        {
          title: 'Emails',
          blocks: [{ p: 'If you write to us, we keep your message and your email address only as long as needed to answer you.' }],
        },
        {
          title: 'Your rights',
          blocks: [
            {
              p: 'You can ask us what data concerns you, or ask us to correct or delete it, by writing to {email}. Given what we collect, we usually hold nothing that identifies you, apart from the emails you send us.',
            },
          ],
        },
        {
          title: 'Changes',
          blocks: [{ p: 'We update this page whenever our practices change.' }],
        },
      ],
    },
  },

  'image-rights': {
    'ar-sa': {
      title: 'حقوق الصور وطلبات الإزالة',
      description:
        'صور الدراجات على Darraja Bikes ملك للشركات المصنّعة: لماذا نعرضها، وكيف نعرضها، وكيف تطلب إزالة صورة خلال 48 ساعة.',
      sections: [
        { blocks: [{ p: 'صور الدراجات المعروضة على Darraja Bikes هي صور الشركات المصنّعة، وحقوقها لأصحابها.' }] },
        {
          title: 'لماذا نعرض هذه الصور',
          blocks: [
            {
              p: 'نعرض صورة كل دراجة لنحدّد بدقة الطراز الذي نصفه: فـDarraja Bikes دليلٌ وأداة مقارنة، ولا نبيع شيئًا. وفي صفحة كل دراجة رابط إلى صفحتها على موقع الشركة المصنّعة.',
            },
          ],
        },
        {
          title: 'ما نفعله وما لا نفعله',
          blocks: [
            {
              ul: [
                'نعرض الصورة كما نشرتها الشركة المصنّعة، دون تعديل.',
                'الملاحظات المرسومة التي تشير إلى القطع طبقةٌ مستقلة فوق الصورة؛ والصورة نفسها لا تتغيّر.',
                'لا نبيع هذه الصور ولا نرخّصها، ولا ندّعي أي حق عليها.',
              ],
            },
          ],
        },
        {
          title: 'الإزالة خلال 48 ساعة',
          blocks: [
            {
              p: 'إن كنت صاحب حقوق صورة، أو تمثّل الشخص أو الشركة صاحبة الحقوق، وتريد إزالتها، فراسلنا على {email} مع ذكر:',
            },
            {
              ul: [
                'عنوان الصفحة التي تظهر فيها الصورة؛',
                'الصورة المعنية، أو وصفها؛',
                'من أنت، والحقوق التي تملكها أو تمثّلها.',
              ],
            },
            { p: 'نزيل الصورة من الموقع خلال 48 ساعة من استلام طلبك.' },
          ],
        },
        {
          title: 'الاتفاقات',
          blocks: [
            {
              p: 'نفضّل النشر بإذن. إن كنت شركةً مصنّعة أو موزّعًا وتريد تزويدنا بصور رسمية أو بملف صحفي، فراسلنا.',
            },
          ],
        },
      ],
    },
    'en-sa': {
      title: 'Image rights and removal requests',
      description:
        'Bike photos on Darraja Bikes belong to their manufacturers: why and how we show them, and how to have a photo removed within 48 hours.',
      sections: [
        { blocks: [{ p: "The bike photos shown on Darraja Bikes are the manufacturers' photos, and their rights belong to their owners." }] },
        {
          title: 'Why we show these photos',
          blocks: [
            {
              p: "We show each bike's photo to identify exactly which model we are describing: Darraja Bikes is a guide and a comparison tool, and we sell nothing. Each bike page links to that bike's page on the manufacturer's website.",
            },
          ],
        },
        {
          title: 'What we do and do not do',
          blocks: [
            {
              ul: [
                'We show the photo as the manufacturer published it, without retouching.',
                'The drawn notes pointing to parts are a separate layer over the photo; the photo itself is unchanged.',
                'We do not sell or license these photos, and we claim no rights over them.',
              ],
            },
          ],
        },
        {
          title: 'Removal within 48 hours',
          blocks: [
            {
              p: 'If you hold the rights to a photo, or represent the person or company that does, and you want it removed, write to {email} with:',
            },
            {
              ul: [
                'the address of the page where the photo appears;',
                'the photo concerned, or a description of it;',
                'who you are, and the rights you hold or represent.',
              ],
            },
            { p: 'We remove the photo from the site within 48 hours of receiving your request.' },
          ],
        },
        {
          title: 'Agreements',
          blocks: [
            {
              p: 'We prefer to publish with permission. If you are a manufacturer or a distributor and want to provide official photos or a press kit, write to us.',
            },
          ],
        },
      ],
    },
  },

  contact: {
    'ar-sa': {
      title: 'التواصل والمعلومات القانونية',
      description:
        'راسل Darraja Bikes بالبريد الإلكتروني للإبلاغ عن خطأ، أو لطلب إزالة صورة، أو للسؤال عن بياناتك؛ والمعلومات القانونية عن الموقع.',
      sections: [
        {
          blocks: [
            { p: 'راسلنا على {email}. ليس لدينا نموذج تواصل ولا رقم هاتف.' },
            { p: 'يمكنك مراسلتنا من أجل:' },
            {
              ul: [
                'الإبلاغ عن خطأ في مواصفةٍ أو سعر؛',
                'طلب إزالة صورة (انظر «{page:image-rights}»)؛',
                'سؤالٍ عن بياناتك (انظر «{page:privacy}»).',
              ],
            },
          ],
        },
        {
          title: 'المعلومات القانونية',
          blocks: [
            {
              ul: [
                // L'arabe d'abord : une parenthèse ouverte après un nom latin se rangeait du mauvais côté (capture du 19 octobre).
                'اسم الموقع: درّاجة (Darraja Bikes)',
                'العنوان: darrajabikes.com',
                'المسؤول عن النشر: {publisher} — {country}',
                'البريد الإلكتروني: {email}',
                'الاستضافة: Hetzner Online GmbH، ألمانيا',
              ],
            },
          ],
        },
        {
          title: 'مصدر معلوماتنا',
          blocks: [
            {
              p: 'تأتي المواصفات والأسعار من المواقع الرسمية للشركات المصنّعة. والسعر المعروض هو السعر الذي توصي به الشركة المصنّعة في الولايات المتحدة، بالدولار الأمريكي: وهو ليس سعرًا محليًا في الخليج.',
            },
          ],
        },
      ],
    },
    'en-sa': {
      title: 'Contact and legal information',
      description:
        'Write to Darraja Bikes by email to report an error, request a photo removal or ask about your data; legal information about the site.',
      sections: [
        {
          blocks: [
            { p: 'Write to us at {email}. We have no contact form and no phone line.' },
            { p: 'You can write to us to:' },
            {
              ul: [
                'report an error in a specification or a price;',
                'ask for a photo to be removed (see “{page:image-rights}”);',
                'ask a question about your data (see “{page:privacy}”).',
              ],
            },
          ],
        },
        {
          title: 'Legal information',
          blocks: [
            {
              ul: [
                'Site name: Darraja Bikes (درّاجة)',
                'Address: darrajabikes.com',
                'Publisher: {publisher} — {country}',
                'Email: {email}',
                'Hosting: Hetzner Online GmbH, Germany',
              ],
            },
          ],
        },
        {
          title: 'Where our information comes from',
          blocks: [
            {
              p: "Specifications and prices come from the manufacturers' official websites. The price shown is the manufacturer's suggested retail price in the United States, in US dollars: it is not a local price in the Gulf.",
            },
          ],
        },
      ],
    },
  },

  terms: {
    'ar-sa': {
      title: 'شروط الاستخدام',
      description:
        'شروط استخدام Darraja Bikes: موقع معلومات وليس متجرًا، وأسعار الشركات المصنّعة في الولايات المتحدة، ومعلومات تُقدَّم كما هي.',
      sections: [
        { blocks: [{ p: 'باستخدامك darrajabikes.com فإنك تقبل هذه الشروط.' }] },
        {
          title: 'ما هو الموقع',
          blocks: [
            {
              p: 'Darraja Bikes موقع معلومات مجاني يساعدك على اكتشاف الدراجات الهوائية ومقارنتها. وهو ليس متجرًا: لا نبيع شيئًا، ولا نتلقّى طلبات ولا مدفوعات.',
            },
          ],
        },
        {
          title: 'المعلومات المنشورة',
          blocks: [
            {
              ul: [
                'تأتي المواصفات من المواقع الرسمية للشركات المصنّعة، وتذكر صفحة كل دراجة مصدرها.',
                'السعر المعروض هو السعر الذي توصي به الشركة المصنّعة في الولايات المتحدة، بالدولار الأمريكي. وهو ليس سعرًا محليًا في بلدك، ولا عرضًا للبيع.',
                'نتحقّق من بياناتنا بعناية، لكن الخطأ وارد، والشركات تغيّر دراجاتها وأسعارها. قبل الشراء، تأكّد من التفاصيل لدى الشركة المصنّعة أو لدى بائع معتمد.',
                'تُقدَّم المعلومات «كما هي» ودون أي ضمان، ولا تتحمّل Darraja Bikes مسؤولية القرارات المتخذة بناءً عليها.',
              ],
            },
          ],
        },
        {
          title: 'الروابط إلى مواقع أخرى',
          blocks: [
            {
              p: 'يضمّ الموقع روابط إلى مواقع الشركات المصنّعة ومواقع أخرى، لا نتحكّم فيها ولا نتحمّل مسؤولية محتواها.',
            },
          ],
        },
        {
          title: 'العلامات التجارية والمحتوى',
          blocks: [
            {
              p: 'أسماء العلامات التجارية والطرازات وصور المنتجات ملكٌ لأصحابها (انظر «{page:image-rights}»). أما نصوص Darraja Bikes ومقارناتها ورسومها وشعارها فملكٌ لـDarraja Bikes: يمكنك مشاركة الروابط بحرية، لكن إعادة نشر محتوانا تتطلّب إذنًا منّا.',
            },
          ],
        },
        {
          title: 'الاستخدام اللائق',
          blocks: [{ p: 'لا تستخدم الموقع بطريقة تضرّ بعمله، كإغراقه بطلباتٍ آلية.' }],
        },
        {
          title: 'التعديلات والقانون المطبَّق',
          blocks: [
            {
              p: 'قد نحدّث هذه الشروط، والنسخة المنشورة على الموقع هي المعتمدة. القانون المطبَّق: {law}.',
            },
          ],
        },
      ],
    },
    'en-sa': {
      title: 'Terms of use',
      description:
        "The terms of use of Darraja Bikes: an information site, not a shop; manufacturers' US prices; information provided as is.",
      sections: [
        { blocks: [{ p: 'By using darrajabikes.com, you accept these terms.' }] },
        {
          title: 'What the site is',
          blocks: [
            {
              p: 'Darraja Bikes is a free information site that helps you discover and compare bikes. It is not a shop: we sell nothing, and we take no orders or payments.',
            },
          ],
        },
        {
          title: 'Information on the site',
          blocks: [
            {
              ul: [
                "Specifications come from the manufacturers' official websites, and each bike page names its source.",
                "The price shown is the manufacturer's suggested retail price in the United States, in US dollars. It is not a local price in your country, and it is not an offer to sell.",
                'We check our data carefully, but errors are possible, and manufacturers change their bikes and prices. Before you buy, confirm the details with the manufacturer or an authorised retailer.',
                'The information is provided “as is”, without any guarantee, and Darraja Bikes is not liable for decisions made on the basis of it.',
              ],
            },
          ],
        },
        {
          title: 'Links to other sites',
          blocks: [
            {
              p: "The site links to manufacturers' websites and other sites. We do not control them and are not responsible for their content.",
            },
          ],
        },
        {
          title: 'Brands and content',
          blocks: [
            {
              p: 'Brand names, model names and product photos belong to their owners (see “{page:image-rights}”). The texts, comparisons, drawings and logo of Darraja Bikes belong to Darraja Bikes: you are free to share links, but republishing our content requires our permission.',
            },
          ],
        },
        {
          title: 'Fair use',
          blocks: [{ p: 'Do not use the site in a way that harms its operation, for example by flooding it with automated requests.' }],
        },
        {
          title: 'Changes and applicable law',
          blocks: [{ p: 'We may update these terms; the version published on the site applies. Applicable law: {law}.' }],
        },
      ],
    },
  },
};

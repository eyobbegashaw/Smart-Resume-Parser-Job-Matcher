/**
 * AI Career Growth & Diagnostics Engine ("Guess Works")
 * Evaluates extracted PDF resume skills and history to project:
 * - Best-fitting role hypotheses
 * - Seniority level estimation
 * - High-impact skill gaps to learn next
 * - Resume ATS optimization checklist
 */

export function generateCareerDiagnostics(parsedData = {}, analysis = {}) {
  const hardSkills = (parsedData.skills?.hard || []).map((s) => String(s).toLowerCase());
  const allSkills = (parsedData.skills?.all || []).map((s) => String(s).toLowerCase());
  const experienceList = Array.isArray(parsedData.experience) ? parsedData.experience : [];
  const expCount = experienceList.length;

  const hasSkill = (...keywords) =>
    keywords.some((kw) => {
      const lower = kw.toLowerCase();
      return allSkills.some((s) => s.includes(lower)) || hardSkills.some((s) => s.includes(lower));
    });

  // 1. Seniority Level Hypothesis
  let seniorityLevel = 'junior';
  let seniorityKey = 'resumes.seniorityJunior';
  let expHorizon = '0–2 years';

  const titleWords = experienceList.map((e) => (e.title || '').toLowerCase()).join(' ');
  const hasSeniorTitle = /senior|lead|principal|architect|head|manager/.test(titleWords);

  if (hasSeniorTitle || expCount >= 4) {
    seniorityLevel = expCount >= 6 ? 'principal' : 'senior';
    seniorityKey = expCount >= 6 ? 'resumes.seniorityPrincipal' : 'resumes.senioritySenior';
    expHorizon = expCount >= 6 ? '7+ years' : '5–7 years';
  } else if (expCount >= 2) {
    seniorityLevel = 'mid';
    seniorityKey = 'resumes.seniorityMid';
    expHorizon = '2–4 years';
  }

  // 2. Target Role Hypotheses ("Guess Works")
  const targetRoles = [];

  const isFullStack =
    (hasSkill('react', 'vue', 'angular', 'html', 'css') && hasSkill('node', 'express', 'django', 'python', 'sql', 'mongo')) ||
    hasSkill('full stack', 'fullstack');

  const isFrontend = hasSkill('react', 'vue', 'angular', 'javascript', 'typescript', 'tailwind', 'next.js', 'frontend');
  const isBackend = hasSkill('node', 'express', 'python', 'django', 'fastapi', 'java', 'spring', 'go', 'golang', 'c#', '.net', 'sql', 'postgres', 'mongodb');
  const isDevOps = hasSkill('docker', 'kubernetes', 'aws', 'ci/cd', 'linux', 'devops', 'terraform', 'jenkins');
  const isDataAI = hasSkill('python', 'machine learning', 'data analysis', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'power bi', 'sql');
  const isMobile = hasSkill('react native', 'flutter', 'android', 'ios', 'swift', 'kotlin');

  if (isFullStack) {
    targetRoles.push({
      title: seniorityLevel === 'senior' ? 'Senior Full-Stack Engineer' : 'Full-Stack Software Engineer',
      matchScore: 94,
      category: 'Software Engineering',
      rationaleEn: 'Demonstrated proficiency in both client-side interfaces and server/database architecture.',
      rationaleAm: 'በሁለቱም የፊት ለፊት (Frontend) እና የኋለኛ (Backend) የቴክኖሎጂ አወቃቀር ላይ ጠንካራ ክህሎት አሳይተዋል።'
    });
  }

  if (isBackend) {
    targetRoles.push({
      title: seniorityLevel === 'senior' ? 'Senior Backend & API Architect' : 'Backend Software Developer',
      matchScore: 91,
      category: 'Backend Architecture',
      rationaleEn: 'Core strengths in API design, database schemas, and robust server-side processing.',
      rationaleAm: 'በኤፒአይ (API) ዲዛይን፣ በዳታቤዝ እና በአገልጋይ ቴክኖሎጂዎች ላይ ጠንካራ ብቃት አሳይተዋል።'
    });
  }

  if (isFrontend) {
    targetRoles.push({
      title: seniorityLevel === 'senior' ? 'Lead Frontend Developer' : 'Frontend Engineer / UI Developer',
      matchScore: 89,
      category: 'Frontend & UI Engineering',
      rationaleEn: 'Solid foundation in modern web frameworks, component architectures, and responsive UI.',
      rationaleAm: 'በዘመናዊ የድር መተግበሪያዎች እና በተጠቃሚ ገጽታ (UI) ምህንድስና ላይ ብቁ ናቸው።'
    });
  }

  if (isDevOps) {
    targetRoles.push({
      title: 'Cloud & DevOps Specialist',
      matchScore: 87,
      category: 'Cloud Infrastructure',
      rationaleEn: 'Containerization, cloud deployments, and automated delivery pipelines detected.',
      rationaleAm: 'በደመና (Cloud) መሰረተ-ልማት እና በራስ-ሰር የማሰማሪያ መንገዶች (CI/CD) ላይ ክህሎት አሳይተዋል።'
    });
  }

  if (isDataAI) {
    targetRoles.push({
      title: 'Data Analyst & AI Practitioner',
      matchScore: 88,
      category: 'Data & Applied AI',
      rationaleEn: 'Statistical modeling, exploratory analysis, and data transformation pipeline experience.',
      rationaleAm: 'በመረጃ ትንተና፣ ስታትስቲክስ እና ሰው-ሰራሽ አስተውሎት (AI) አተገባበር ላይ ብቃት አሳይተዋል።'
    });
  }

  if (isMobile) {
    targetRoles.push({
      title: 'Mobile Application Developer',
      matchScore: 86,
      category: 'Mobile Engineering',
      rationaleEn: 'Native or cross-platform mobile development capabilities identified.',
      rationaleAm: 'በተንቀሳቃሽ ስልክ መተግበሪያዎች (Mobile Apps) ልማት ላይ ችሎታ ተገኝቷል።'
    });
  }

  // Fallback role if skills are generic or sparse
  if (targetRoles.length === 0) {
    targetRoles.push({
      title: seniorityLevel === 'senior' ? 'Senior Technology Professional' : 'Software Associate',
      matchScore: 80,
      category: 'Information Technology',
      rationaleEn: 'Adaptable computing skillset suitable for progressive software and technical projects.',
      rationaleAm: 'ለተለያዩ የቴክኖሎጂ እና የሶፍትዌር ሥራዎች ተስማሚ የሆነ መነሻ ክህሎት።'
    });
  }

  // 3. Recommended Next-Level High-Impact Skills (Skill Gap Roadmap)
  const recommendedSkills = [];

  if (!hasSkill('docker', 'kubernetes', 'aws', 'gcp')) {
    recommendedSkills.push({
      name: 'Cloud & Docker Containers',
      priority: 'High',
      impactEn: 'Essential for modern containerized microservices and cloud deployments.',
      impactAm: 'ለዘመናዊ የደመና (Cloud) ማሰማሪያዎች እና ማይክሮሰርቪስ እጅግ አስፈላጊ ነው።'
    });
  }

  if (!hasSkill('typescript')) {
    recommendedSkills.push({
      name: 'TypeScript',
      priority: 'High',
      impactEn: 'Industry standard for enterprise web codebases; dramatically reduces runtime regressions.',
      impactAm: 'ለትላልቅ ተቋማት የድር ፕሮጀክቶች ተመራጭ እና የኮድ ጥራትን የሚያረጋግጥ ነው።'
    });
  }

  if (!hasSkill('ci/cd', 'github actions', 'jenkins', 'gitlab ci')) {
    recommendedSkills.push({
      name: 'CI/CD Pipelines (GitHub Actions)',
      priority: 'Medium',
      impactEn: 'Automates testing, linting, and zero-downtime deployment workflows.',
      impactAm: 'የሙከራ እና የማሰማራት ሂደቶችን በራስ-ሰር በማከናወን ፍጥነትን ይጨምራል።'
    });
  }

  if (!hasSkill('graphql', 'grpc', 'redis', 'kafka')) {
    recommendedSkills.push({
      name: 'Caching & Advanced APIs (Redis / GraphQL)',
      priority: 'Medium',
      impactEn: 'Significantly enhances throughput and latency for high-scale applications.',
      impactAm: 'ከፍተኛ ተጠቃሚ ላላቸው መተግበሪያዎች ፍጥነትን እና አቅምን ያሳድጋል።'
    });
  }

  if (!hasSkill('unit test', 'jest', 'cypress', 'pytest')) {
    recommendedSkills.push({
      name: 'Automated Testing (Jest / PyTest / Cypress)',
      priority: 'High',
      impactEn: 'Demonstrates senior-level engineering discipline and reliable software delivery.',
      impactAm: 'የከፍተኛ ደረጃ ምህንድስና ስነ-ስርዓትን እና አስተማማኝ ሶፍትዌር መስራትን ያሳያል።'
    });
  }

  // 4. Resume Optimization Checklist (ATS Readiness)
  const textBlob = [
    parsedData.summary,
    ...(experienceList.map((e) => (e.responsibilities || []).join(' ')))
  ].join(' ');

  const hasNumbers = /\d+[%kKmM]?|\$\d+/.test(textBlob);
  const hasActionVerbs = /designed|developed|architected|spearheaded|engineered|optimized|reduced|increased|managed|built|created|led/i.test(textBlob);
  const hasContactInfo = Boolean(parsedData.email && parsedData.phone);
  const hasEducation = (parsedData.education || []).length > 0;

  const optimizations = [
    {
      titleEn: 'Quantifiable Metric Bullets',
      titleAm: 'በቁጥር የተደገፉ ውጤቶች',
      passed: hasNumbers,
      tipEn: hasNumbers
        ? 'Great! Your resume contains measurable impact metrics.'
        : 'Tip: Add measurable numbers (e.g. "Improved latency by 35%", "Handled 10k+ daily users").',
      tipAm: hasNumbers
        ? 'በጣም ጥሩ! ሲቪዎ ሊለኩ የሚችሉ ውጤቶችን እና ቁጥሮችን አካቷል።'
        : 'ምክር፡ የተሰሩ ስራዎችን በቁጥር ይግለጹ (ለምሳሌ "ፍጥነትን በ35% አሻሽሏል"፣ "10 ሺህ+ ተጠቃሚዎችን አስተናግዷል")።'
    },
    {
      titleEn: 'Strong Action Verbs',
      titleAm: 'ጠንካራ የተግባር ቃላት',
      passed: hasActionVerbs,
      tipEn: hasActionVerbs
        ? 'Strong active phrasing detected across experience sections.'
        : 'Tip: Begin bullet points with active verbs like "Architected", "Engineered", "Optimized".',
      tipAm: hasActionVerbs
        ? 'በሥራ ልምድ ዝርዝርዎ ውስጥ ጠንካራ የተግባር ቃላት ተገኝተዋል።'
        : 'ምክር፡ እያንዳንዱን ነጥብ እንደ "ነደፈ"፣ "አዘጋጀ"፣ "አሻሻለ" ባሉ ግልጽ ቃላት ይጀምሩ።'
    },
    {
      titleEn: 'Contact & Communication Channels',
      titleAm: 'የመገኛ እና የመገናኛ መረጃ',
      passed: hasContactInfo,
      tipEn: hasContactInfo
        ? 'Valid email and direct phone contact identified.'
        : 'Tip: Ensure an easily parseable phone number and active email address are at the top.',
      tipAm: hasContactInfo
        ? 'ትክክለኛ ኢሜይል እና የስልክ አድራሻ ተገኝቷል።'
        : 'ምክር፡ ግልጽ የሆነ የስልክ ቁጥር እና ንቁ የኢሜይል አድራሻ ከላይ ማስቀመጥዎን ያረጋግጡ።'
    },
    {
      titleEn: 'Educational Credentials',
      titleAm: 'የትምህርት ታሪክ',
      passed: hasEducation,
      tipEn: hasEducation
        ? 'Academic degrees or technical certificates successfully parsed.'
        : 'Tip: Include institution name, degree field, and completion timeline.',
      tipAm: hasEducation
        ? 'የትምህርት ደረጃ ወይም የሙያ ምስክር ወረቀቶች ተገኝተዋል።'
        : 'ምክር፡ የተቋሙን ስም፣ የትምህርት መስክ እና የተመረቁበትን ዓመት ያካትቱ።'
    }
  ];

  return {
    seniority: {
      level: seniorityLevel,
      labelKey: seniorityKey,
      horizon: expHorizon
    },
    targetRoles,
    recommendedSkills: recommendedSkills.slice(0, 4),
    optimizations
  };
}

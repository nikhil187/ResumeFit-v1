const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
export async function analyzeCompatibility(resume, jobDescription, quizScore) {
  try {
    console.log("API analyzeCompatibility called with:", { resume, jobDescription, quizScore });
    
    // Check if resume or jobDescription is undefined or empty
    if (!resume || !jobDescription) {
      console.error("Missing resume or job description");
      throw new Error("Missing resume or job description");
    }
    
    // Ensure quizScore is a valid number, default to 0 if not provided or invalid
    const validatedQuizScore = (quizScore !== undefined && !isNaN(Number(quizScore))) ? Number(quizScore) : 0;
    console.log("Validated quiz score:", validatedQuizScore);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{
          role: "user",
          content: `Act as an advanced AI-powered career advisor with expertise in technical recruiting and data-driven career analytics. Conduct a comprehensive, data-driven analysis of the candidate's resume against the job description, incorporating their technical assessment quiz performance.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

QUIZ RESULTS:
The candidate scored ${validatedQuizScore}/10 on an advanced technical assessment quiz specifically designed for this role.

ANALYSIS FRAMEWORK:

1. TECHNICAL SKILLS MATCH (25% of total score):
   - Extract ALL technical skills, frameworks, languages, and tools mentioned in the job description
   - For each skill, assign a weight (1-5) based on:
     * Frequency of mention in job description (more mentions = higher weight)
     * Position in job description (earlier mentions = higher weight)
     * Whether it's listed as "required" vs "preferred" vs "nice-to-have"
     * The criticality of the skill to the core job function
   - For each skill, evaluate the candidate's proficiency level (0-5) based on:
     * Years of experience with the skill
     * Recency of experience
     * Context in which skill was used (professional, academic, personal)
     * Complexity of projects involving the skill
     * Evidence of mastery (leadership, teaching, innovation)
   - Calculate a weighted technical skills match percentage
   - A score of 0 should be given for critical skills with no evidence in resume

2. EXPERIENCE RELEVANCE (20% of total score):
   - Analyze the candidate's past roles and responsibilities
   - Evaluate industry relevance (same industry = higher score)
   - Assess role similarity (similar responsibilities = higher score)
   - Consider career progression and growth trajectory
   - Evaluate project scale and complexity relative to job requirements
   - Consider company size/prestige where relevant
   - Assess duration and tenure stability pattern

3. EDUCATION & QUALIFICATIONS (15% of total score):
   - Compare educational requirements with candidate's credentials
   - Evaluate relevance of degree field to job requirements
   - Consider advanced degrees where relevant
   - Assess additional certifications and specialized training
   - Evaluate academic achievements and honors if relevant
   - Consider continuing education and professional development

4. QUIZ PERFORMANCE (30% of total score):
   - Use the actual quiz score percentage: ${validatedQuizScore * 10}%
   - The quiz score should directly correlate to this category score
   - If the quiz score is 0/10, then this category should receive a score close to 0
   - If the quiz score is 10/10, then this category should receive a score close to 100
   - Be sure this is accurately reflected in the final categoryScores object

5. CAREER TRAJECTORY (10% of total score):
   - Analyze career progression pattern
   - Evaluate growth in responsibility
   - Assess skills development over time
   - Consider how well the role fits into candidate's career path
   - Evaluate leadership development where relevant

6. CALCULATE FINAL COMPATIBILITY SCORE:
   - Combine weighted scores from all categories
   - Normalize to a 0-100 scale
   - Apply any final adjustments based on exceptional strengths or critical weaknesses
   - Provide both overall score and per-category scores

7. DETAILED GAP ANALYSIS:
   - For each major skill gap, provide specific recommendations
   - For each experience gap, suggest ways to demonstrate transferable skills
   - Highlight areas where the candidate exceeds expectations

BE HONEST AND ACCURATE - NEITHER INFLATE NOR DEFLATE SCORES. The goal is to give candidates a realistic assessment.

For the learning resources and roadmap, focus specifically on addressing the candidate's skill gaps:

For each major skill gap, provide:
1. Comprehensive list of specific topics and concepts to learn:
   - Break down each skill area into foundational, intermediate, and advanced topics
   - For each topic, briefly explain why it's important for the job
   - Include the estimated time needed to master each topic

2. Core technical principles and design patterns to understand:
   - For each principle, explain its practical application
   - Highlight how these principles connect to the job requirements

3. Practical skills to develop:
   - Specific techniques, practices, or methodologies
   - Tools and technologies to become proficient with
   - Industry-standard workflows relevant to the job

Create a comprehensive learning roadmap that:
1. Prioritizes skills in order of:
   - Criticality to the job requirements
   - Size of the current skill gap
   - Time required to reach proficiency
2. Shows a clear progression from fundamentals to advanced topics
3. Includes measurable milestones
4. Organizes the learning journey into phases (e.g., Foundation, Building, Mastery)
5. For each phase, provides specific learning objectives and skill targets
6. Includes both theoretical concepts and practical applications

IMPORTANT FORMATTING REQUIREMENTS:
- Use proper HTML with headers, paragraphs, and lists
- Include ACTUAL URLs in anchor tags with target="_blank"
- Make each resource unique and specific (no repetition)
- For courses, include the platform, course name, instructor, duration, and difficulty
- Organize content with clear headings using h2 for main sections and h3 for subsections
- Present information in visually digestible chunks (bullets, short paragraphs)
- Use color coding HTML spans where helpful (red for critical gaps, green for strengths)
- Include a brief executive summary at the beginning (2-3 sentences)
- Structure the roadmap with clear phase headings (e.g., <h3>Phase 1: Foundations</h3>)
- For each topic in the roadmap, include a brief description of what should be learned
- Group related topics together under appropriate subheadings
- Use nested lists to show progression from basic to advanced concepts
- Include a timeline estimate for each phase (e.g., "4-6 weeks")
- Make the content actionable and directly applicable to the job requirements

ADDITIONAL DATA FOR VISUALIZATION:
Include a "skillsAnalysis" field in your response that contains an array of the top 10 skills from the job description with the following data for each:
1. "skill": The name of the skill
2. "relevance": How important this skill is for the job (0-100)
3. "match": How well the candidate's experience matches this skill requirement (0-100)
4. "gap": The gap between the job requirement and candidate's experience (0-100)

Also include category scores for visualization:
1. "categoryScores": An object with scores for each major category (Technical Skills, Experience, Education, Quiz, Career Trajectory)

Return ONLY a JSON object in this exact format with no additional text:
{
    "summary": "HTML formatted summary of the match",
    "analysis": "HTML formatted detailed analysis with strengths and weaknesses",
    "recommendations": "HTML formatted specific recommendations for improvement",
    "learningResources": "HTML formatted section with comprehensive topics to learn for each skill gap",
    "learningRoadmap": "HTML formatted learning plan organized by learning phases with specific topics to master",
    "skillsMatchPercentage": 75,
    "score": 70,
    "categoryScores": {
        "technicalSkills": 65,
        "experience": 70,
        "education": 80,
        "quizPerformance": ${validatedQuizScore * 10}, 
        "careerTrajectory": 75
    },
    "skillsAnalysis": [
        {"skill": "JavaScript", "relevance": 90, "match": 85, "gap": 15},
        {"skill": "React", "relevance": 85, "match": 70, "gap": 30},
        {"skill": "Node.js", "relevance": 80, "match": 65, "gap": 35},
        {"skill": "SQL", "relevance": 75, "match": 80, "gap": 0},
        {"skill": "Git", "relevance": 70, "match": 90, "gap": 0},
        {"skill": "AWS", "relevance": 65, "match": 60, "gap": 40},
        {"skill": "Docker", "relevance": 60, "match": 50, "gap": 50},
        {"skill": "TypeScript", "relevance": 55, "match": 75, "gap": 25},
        {"skill": "MongoDB", "relevance": 50, "match": 45, "gap": 55},
        {"skill": "CI/CD", "relevance": 45, "match": 30, "gap": 70}
    ],
    "strengths": ["Strong JavaScript fundamentals", "Excellent problem-solving skills", "Good database knowledge", "Solid understanding of version control", "Proven team collaboration"],
    "areasForGrowth": ["Limited cloud experience", "Needs more DevOps knowledge", "Could strengthen system design skills"]
}`
        }],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log("API Response:", data);
    const content = data.choices[0].message.content;
    
    try {
      // Handle Markdown code blocks and extract the JSON content
      let jsonContent = content;
      if (content.includes('```json')) {
        jsonContent = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonContent = content.split('```')[1].split('```')[0].trim();
      }
      
      // Attempt to parse the extracted JSON content
      const parsedContent = JSON.parse(jsonContent);
      console.log("Parsed content:", parsedContent);
      
      // Validate that the quiz performance matches the actual quiz score
      if (parsedContent.categoryScores && 
          Math.abs(parsedContent.categoryScores.quizPerformance - (validatedQuizScore * 10)) > 5) {
        console.warn("Quiz performance score doesn't match actual quiz score. Fixing...");
        parsedContent.categoryScores.quizPerformance = validatedQuizScore * 10;
        
        // Also update overall score to reflect correct quiz performance
        const weights = {
          technicalSkills: 0.35,
          experience: 0.25,
          education: 0.15,
          quizPerformance: 0.15,
          careerTrajectory: 0.10
        };
        
        let newScore = 0;
        Object.keys(weights).forEach(category => {
          newScore += parsedContent.categoryScores[category] * weights[category];
        });
        
        parsedContent.score = Math.round(newScore);
      }
      
      return parsedContent;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw content:", content);
      throw new Error("Failed to parse analysis data");
    }
  } catch (error) {
    console.error('Error analyzing compatibility:', error);
    throw error;
  }
}

export async function generateQuiz(jobDescription) {
  try {
    console.log("API generateQuiz called with:", { jobDescription });
    
    // Check if jobDescription is undefined or empty
    if (!jobDescription) {
      console.error("Missing job description");
      throw new Error("Missing job description");
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{
          role: "system",
          content: "You are a senior-level quiz generator for technical hiring. Your job is to deeply test a candidate's understanding of real-world tasks they would perform as a Data Analyst Intern. Create 10 multiple-choice questions (MCQs) that reflect hands-on challenges, logic-based reasoning, and problem-solving.\n\nFocus on deep understanding of:\n- Excel and dashboarding for reporting trends\n- Using data for evaluating technologies (e.g., SUNY inventions)\n- Supporting research teams with tools and reporting\n- Managing data cleaning and transformations\n- Communicating technical findings to mixed audiences\n\nEach question must be:\n- Based on a realistic task the candidate might face\n- Focused on logic, correct use of tools, or decision-making\n- Non-trivial and not definitional or multiple-right-answers\n\nEach question must return:\n{\n  \"question\": \"Real-world applied scenario\",\n  \"options\": [\"A\", \"B\", \"C\", \"D\"],\n  \"correctAnswer\": 1,\n  \"explanation\": \"Why the answer is right and others aren't\",\n  \"difficulty\": \"intermediate\" or \"advanced\",\n  \"category\": \"e.g., Excel, Research Evaluation, Data Communication\"\n}\n\nAvoid simple or guessable answers. Make them think.\nOutput only the final JSON array of 10 questions."
        }, {
          role: "user",
          content: `Generate quiz based on the following job description:\n\n${jobDescription}`
        }],
        temperature: 0.7,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      throw new Error("API request failed with status " + response.status);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract the JSON from the string response
    let jsonString = content;
    if (content.includes('```json')) {
      jsonString = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonString = content.split('```')[1].split('```')[0].trim();
    }
    
    // Try to parse the JSON and handle malformed responses
    try {
      // Attempt a simple fix for common JSON issues (removing stray commas)
      const fixedJson = jsonString.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
      const questions = JSON.parse(fixedJson);
      
      // Check if we have questions
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        throw new Error("No questions were generated");
      }
      
      // Format all questions as multiple choice
      const formattedQuestions = questions.map(q => ({
        ...q,
        questionType: "Multiple Choice (single answer)"
      }));
      
      console.log("Generated quiz with", formattedQuestions.length, "questions");
      return formattedQuestions;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.log("Problematic JSON:", jsonString.substring(Math.max(0, parseError.position - 100), parseError.position + 100));
      
      // Attempt to fix common JSON parsing issues
      let fixedJson = jsonString;
      // Try to escape unescaped quotes inside strings
      try {
        // You could implement a more robust JSON repair here
        // This is a simple example that might not work for all cases
        // Simple JSON repair: fix common issues like trailing commas
        fixedJson = fixedJson.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        // Try to escape unescaped quotes in strings
        fixedJson = fixedJson.replace(/:\s*"([^"]*)"/g, (match, p1) => {
          return `: "${p1.replace(/(?<!\\)"/g, '\\"')}"`;
        });
        
        const questions = JSON.parse(fixedJson);
        
        // Format all questions as multiple choice
        const formattedQuestions = questions.map(q => ({
          ...q,
          questionType: "Multiple Choice (single answer)"
        }));
        
        console.log("Generated quiz with", formattedQuestions.length, "questions");
        return formattedQuestions;
      } catch (repairError) {
        // If repair fails, throw a more helpful error
        throw new Error("Could not parse quiz response: " + parseError.message);
      }
    }
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
}

export async function extractKeySkills(jobDescription) {
  try {
    console.log("API extractKeySkills called with:", { jobDescription });
    
    if (!jobDescription) {
      console.error("Missing job description");
      throw new Error("Missing job description");
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{
          role: "user",
          content: `Extract the top 10 most important technical skills and technologies from this job description. 
          Return ONLY a JSON array of strings with no additional text or explanation.
          Format your response as a valid JSON array like this: ["Skill1", "Skill2", "Skill3"]
          
          Job Description: ${jobDescription}`
        }],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API Response:", data);
    const content = data.choices[0].message.content;
    
    try {
      const parsedContent = JSON.parse(content);
      console.log("Parsed skills:", parsedContent);
      return parsedContent;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw content:", content);
      throw new Error("Failed to parse skills data");
    }
  } catch (error) {
    console.error('Error extracting key skills:', error);
    throw error;
  }
}

export async function extractResumeSkills(resume, jobDescription) {
  try {
    console.log("API extractResumeSkills called with:", { resume, jobDescription });
    
    if (!resume || !jobDescription) {
      console.error("Missing resume or job description");
      throw new Error("Missing resume or job description");
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{
          role: "user",
          content: `Analyze this resume against the job description:
          
          1. Extract all technical skills mentioned in the resume
          2. Compare these skills with the job description requirements
          3. For each skill in the resume, rate the match level (0-5) where:
             - 5: Expert level match, explicitly mentioned in both
             - 3-4: Good match, mentioned or implied in both
             - 1-2: Basic match, somewhat related but not directly mentioned
             - 0: Not relevant to the job description
          4. Identify important skills from the job description missing in the resume
          
          Return ONLY a JSON object in this exact format with no additional text:
          {
              "skills": ["skill1", "skill2", ...],
              "matchAnalysis": {
                  "skill1": {"level": 5, "relevance": "high"},
                  "skill2": {"level": 3, "relevance": "medium"},
                  ...
              },
              "missingSkills": ["missing1", "missing2", ...]
          }
          
          Resume: ${resume}
          Job Description: ${jobDescription}`
        }],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API Response:", data);
    const content = data.choices[0].message.content;
    
    try {
      const parsedContent = JSON.parse(content);
      console.log("Parsed resume skills:", parsedContent);
      return parsedContent;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw content:", content);
      throw new Error("Failed to parse resume skills data");
    }
  } catch (error) {
    console.error('Error extracting resume skills:', error);
    throw error;
  }
}

export async function generateInterviewQuestions(jobDescription, resume) {
  try {
    console.log("API generateInterviewQuestions called with:", { jobDescription, resume });
    
    // Check if jobDescription is undefined or empty
    if (!jobDescription) {
      console.error("Missing job description");
      throw new Error("Missing job description");
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{
          role: "system",
          content: `Act as an expert technical interviewer. Analyze the following job description and my resume. Based on this, generate a comprehensive set of interview questions grouped by relevant topics. Create as many topic areas as possible to cover all aspects of the job requirements. Each topic should have 3–5 questions covering mixed difficulty levels. For each question, provide a sample answer tailored to my profile. Ensure the questions align with the job responsibilities, technologies, and soft skills mentioned in the job description. Use the resume to personalize the answers.

IMPORTANT FORMATTING INSTRUCTIONS:
- Return ONLY valid JSON with NO trailing commas
- Use double quotes for all strings
- Properly escape quotes within strings using backslash (\\")
- Properly escape backslashes with double backslashes (\\\\)
- Do not include any Markdown formatting markers (like \`\`\`)
- Replace any line breaks in strings with \\n

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume || "No resume provided"}

OUTPUT FORMAT:
Return a JSON array of topic objects, each containing high-quality interview questions. Use the following format:

[
  {
    "topicName": "Skill or Topic Area",
    "questions": [
      {
        "question": "Exact, scenario-based interview question",
        "type": "Technical | Behavioral | Problem-solving | Experience",
        "difficulty": "Basic | Intermediate | Advanced",
        "sampleAnswer": "Clear and specific example showing applied understanding and best practices",
        "tips": "Brief guidance for interviewer on how to evaluate the answer"
      }
    ]
  }
]`
        }],
        temperature: 0.7,
        max_tokens: 8000
      })
    });
    
    if (!response.ok) {
      throw new Error("API request failed with status " + response.status);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract the JSON from the string response
    let jsonString = content;
    if (content.includes('```json')) {
      jsonString = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonString = content.split('```')[1].split('```')[0].trim();
    }
    
    // Try to parse the JSON and handle malformed responses
    try {
      const topicsWithQuestions = JSON.parse(jsonString);
      
      // Check if we have topics with questions
      if (!topicsWithQuestions || !Array.isArray(topicsWithQuestions) || topicsWithQuestions.length === 0) {
        throw new Error("No interview questions were generated");
      }
      
      // Flatten the questions array and add a unique ID to each question
      const flattenedQuestions = topicsWithQuestions.flatMap((topic, topicIndex) => 
        topic.questions.map((question, questionIndex) => ({
          ...question,
          id: `topic-${topicIndex}-question-${questionIndex}`,
          topicName: topic.topicName,
          // Handle both potential response formats (backward compatibility)
          sampleAnswer: question.sampleAnswer || question.Answer
        }))
      );
      
      console.log("Generated interview questions by topics:", topicsWithQuestions.length, "topics with", flattenedQuestions.length, "total questions");
      return {
        topics: topicsWithQuestions,
        questions: flattenedQuestions
      };
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.log("Problematic JSON near position:", parseError.position);
      
      // Extract the problematic area
      const problemStart = Math.max(0, parseError.position - 300);
      const problemEnd = Math.min(jsonString.length, parseError.position + 300);
      console.log("JSON snippet around error:", jsonString.substring(problemStart, problemEnd));
      
      try {
        // Manual JSON repair approach
        let fixedJson = jsonString;
        
        // Common JSON issues to fix:
        
        // 1. Unescaped quotes in strings
        fixedJson = fixedJson.replace(/: "([^"]*)"/g, (match, p1) => {
          // Replace unescaped quotes with escaped quotes
          const fixed = p1.replace(/(?<!\\)"/g, '\\"');
          return `: "${fixed}"`;
        });
        
        // 2. Missing commas between objects in arrays
        fixedJson = fixedJson.replace(/}(\s*){/g, '},\n$1{');
        
        // 3. Trailing commas in objects or arrays
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
        
        // 4. Unescaped backslashes in strings
        fixedJson = fixedJson.replace(/: "([^"]*)"/g, (match, p1) => {
          // Replace unescaped backslashes with escaped backslashes
          const fixed = p1.replace(/(?<!\\)\\/g, '\\\\');
          return `: "${fixed}"`;
        });
        
        // 5. Fix line breaks in strings
        fixedJson = fixedJson.replace(/: "([^"]*)"/g, (match, p1) => {
          // Replace unescaped newlines with \\n
          const fixed = p1.replace(/\n/g, '\\n');
          return `: "${fixed}"`;
        });
        
        // Try to parse the fixed JSON
        console.log("Attempting to parse fixed JSON");
        const topicsWithQuestions = JSON.parse(fixedJson);
        
        // If we get here, the JSON was successfully parsed
        console.log("Successfully parsed fixed JSON");
        
        // Flatten the questions array and add a unique ID to each question
        const flattenedQuestions = topicsWithQuestions.flatMap((topic, topicIndex) => 
          topic.questions.map((question, questionIndex) => ({
            ...question,
            id: `topic-${topicIndex}-question-${questionIndex}`,
            topicName: topic.topicName,
            // Handle both potential response formats (backward compatibility)
            sampleAnswer: question.sampleAnswer || question.Answer
          }))
        );
        
        console.log("Generated interview questions by topics:", topicsWithQuestions.length, "topics with", flattenedQuestions.length, "total questions");
        return {
          topics: topicsWithQuestions,
          questions: flattenedQuestions
        };
      } catch (repairError) {
        console.error("JSON repair failed:", repairError);
        
        // Fallback to a simpler approach - try to extract valid JSON objects
        try {
          // Look for array pattern that might be valid
          const arrayMatch = jsonString.match(/\[\s*\{.*\}\s*\]/s);
          if (arrayMatch) {
            const possibleArray = arrayMatch[0];
            console.log("Found potential JSON array, attempting to parse");
            
            const topics = JSON.parse(possibleArray);
            
            // Basic validation
            if (Array.isArray(topics) && topics.length > 0) {
              // Create a simple flattened structure
              const questions = topics.flatMap((topic, topicIndex) => {
                const topicName = topic.topicName || `Topic ${topicIndex + 1}`;
                
                return (topic.questions || []).map((question, questionIndex) => ({
                  ...question,
                  id: `topic-${topicIndex}-question-${questionIndex}`,
                  topicName: topicName,
                  sampleAnswer: question.sampleAnswer || question.Answer || "No sample answer available"
                }));
              });
              
              return {
                topics: topics,
                questions: questions
              };
            }
          }
          
          // If all else fails, create a minimal structure with whatever we can extract
          console.log("Creating emergency fallback questions");
          
          // Create a simple topic with minimal questions
          const emergencyTopic = {
            topicName: "General Questions",
            questions: [
              {
                question: "The interview question generator encountered an error. Please regenerate questions.",
                type: "Technical",
                difficulty: "Intermediate",
                sampleAnswer: "Please try regenerating the questions for better results."
              }
            ]
          };
          
          const emergencyQuestions = [{
            id: "emergency-0",
            question: "The interview question generator encountered an error. Please regenerate questions.",
            type: "Technical",
            difficulty: "Intermediate",
            topicName: "General Questions",
            sampleAnswer: "Please try regenerating the questions for better results."
          }];
          
          return {
            topics: [emergencyTopic],
            questions: emergencyQuestions
          };
        } catch (finalError) {
          console.error("All JSON recovery attempts failed:", finalError);
          throw new Error("Could not parse interview questions response. Please try again.");
        }
      }
    }
  } catch (error) {
    console.error("Error generating interview questions:", error);
    throw error;
  }
}

export async function generateComprehensiveAnalysis(resume, jobDescription) {
  try {
    console.log("API generateComprehensiveAnalysis called with:", { resume, jobDescription });
    
    // Check if resume or jobDescription is undefined or empty
    if (!resume || !jobDescription) {
      console.error("Missing resume or job description");
      throw new Error("Missing resume or job description");
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{
          role: "system",
          content: `You are a career advisor who provides concise, actionable feedback following a strict format.`
        }, {
          role: "user",
          content: `Create a skills analysis following these EXACT formatting rules:

STRICT FORMAT REQUIREMENTS:
1. Start with exactly this HTML structure: <div class="skills-analysis">
2. Include exactly three sections with these exact titles:
   - <h3>Key Skill Matches</h3>
   - <h3>Career Path Potential</h3>
   - <h3>Priority Growth Areas</h3>
3. For Key Skill Matches and Priority Growth Areas: use ONLY <ul> and <li> elements (exactly 3 bullet points each)
4. For Career Path Potential: use ONLY a single <p> element (max 2 sentences)
5. Do NOT include any other HTML elements or formatting
6. Keep the entire analysis under 300 words
7. End with </div> closing tag

CONTENT REQUIREMENTS:
- Key Skill Matches: List 3 specific skills from the resume that match the job description
- Career Path Potential: Briefly describe how this role could enhance the candidate's career
- Priority Growth Areas: List 3 specific skills from the job description that the candidate needs to develop

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}`
        }],
        temperature: 0.5,
        max_tokens: 1500
      })
    });
    
    if (!response.ok) {
      throw new Error("API request failed with status " + response.status);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return content;
  } catch (error) {
    console.error("Error generating comprehensive analysis:", error);
    throw error;
  }
}

export async function generateSingleMCQ(jobDescription, skill) {
  try {
    console.log("API generateSingleMCQ called with:", { jobDescription, skill });
    
    if (!jobDescription || !skill) {
      console.error("Missing job description or skill");
      throw new Error("Missing job description or skill");
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          {
            role: "system",
            content: `You are an expert-level quiz generator for professional skill assessments. Your task is to generate one multiple-choice question (MCQ) at a time that tests a candidate's deep understanding of a specific skill mentioned in the job description.

Each question must focus on **one** of the following MCQ types:
- **Conceptual Understanding** (e.g., principles, how/why something works)
- **Logical Reasoning** (e.g., what would happen if..., cause-effect logic)
- **Real-world Application** (e.g., what is the best solution for X scenario)
- **Debugging/Problem-solving** (e.g., identify what's wrong, or what should be done)

Each question must:
- Be based on a **real-world situation** or **deep skill insight**
- Include **four options** labeled A–D (only one correct)
- Include the **correct answer index** (0-based)
- Include a **brief but clear explanation**
- Include **question type** (conceptual, logical, applied, problem-solving)
- Include **difficulty** (easy, intermediate, advanced)
- Include **skill category**

Return only valid JSON in this format:

{
  "question": "Question text here",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 1,
  "explanation": "Why this is correct and others aren't",
  "type": "logical",
  "difficulty": "intermediate",
  "category": "React.js"
}

Avoid trivia, vague definitions, or syntax-only questions. Focus on **thinking**, **decision-making**, and **professional-level skills**.`
          },
          {
            role: "user",
            content: `Generate one high-quality MCQ for the skill "${skill}" based on the following job description:

${jobDescription}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API Response:", data);
    const content = data.choices[0].message.content;
    
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      let jsonString = content;
      if (content.includes('```json')) {
        jsonString = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonString = content.split('```')[1].split('```')[0].trim();
      }
      
      // Clean up potential JSON issues
      const fixedJson = jsonString.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
      const questionData = JSON.parse(fixedJson);
      
      return questionData;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw content:", content);
      throw new Error("Failed to parse question data");
    }
  } catch (error) {
    console.error('Error generating single MCQ:', error);
    throw error;
  }
}

export async function extractSkillsForPracticeQuiz(jobDescription) {
  try {
    console.log("API extractSkillsForPracticeQuiz called with job description");
    
    if (!jobDescription) {
      console.error("Missing job description");
      throw new Error("Missing job description");
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{
          role: "system",
          content: `You are an AI specialized in extracting and categorizing skills from job descriptions. Your task is to extract the most important technical and soft skills from the job description and organize them into categories.`
        }, {
          role: "user",
          content: `Extract the key skills from this job description and organize them into appropriate categories. 
          
          For each skill:
          1. Identify the specific skill name
          2. Determine the category it belongs to (e.g., Programming Languages, Frameworks, Tools, Soft Skills, Domain Knowledge)
          3. Assess its importance level to the job (critical, important, beneficial)
          
          Return the results as a JSON array in this format:
          [
            {
              "skill": "JavaScript",
              "category": "Programming Language",
              "importance": "critical"
            },
            {
              "skill": "Problem Solving",
              "category": "Soft Skill",
              "importance": "important"
            }
          ]
          
          Include at least 10-15 skills, focusing on the most relevant ones mentioned in the job description. Include both technical and soft skills if applicable.
          
          Job Description:
          ${jobDescription}`
        }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API Response:", data);
    const content = data.choices[0].message.content;
    
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      let jsonString = content;
      if (content.includes('```json')) {
        jsonString = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonString = content.split('```')[1].split('```')[0].trim();
      }
      
      // Clean up potential JSON issues
      const fixedJson = jsonString.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
      const skillsData = JSON.parse(fixedJson);
      
      // Group skills by category
      const skillsByCategory = skillsData.reduce((acc, skill) => {
        if (!acc[skill.category]) {
          acc[skill.category] = [];
        }
        acc[skill.category].push(skill);
        return acc;
      }, {});
      
      return {
        allSkills: skillsData,
        skillsByCategory: skillsByCategory
      };
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw content:", content);
      throw new Error("Failed to parse skills data");
    }
  } catch (error) {
    console.error('Error extracting skills for practice quiz:', error);
    throw error;
  }
}

export async function generateBatchMCQs(jobDescription, skills, batchSize = 10) {
  try {
    console.log("API generateBatchMCQs called with:", { jobDescription, skills, batchSize });
    
    if (!jobDescription || !skills || !skills.length) {
      console.error("Missing job description or skills");
      throw new Error("Missing job description or skills");
    }
    
    // Format skills for the prompt
    const skillsString = skills.map(skill => {
      if (typeof skill === 'string') {
        return skill;
      } else if (skill.skill) {
        return skill.skill;
      }
      return '';
    }).filter(Boolean).join(', ');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          {
            role: "system",
            content: `You are an expert-level quiz generator for professional skill assessments. Your task is to generate ${batchSize} multiple-choice questions (MCQs) that test a candidate's deep understanding of specific skills mentioned in the job description.

Each question must focus on one of the following MCQ types:
- Conceptual Understanding (e.g., principles, how/why something works)
- Logical Reasoning (e.g., what would happen if..., cause-effect logic)
- Real-world Application (e.g., what is the best solution for X scenario)
- Debugging/Problem-solving (e.g., identify what's wrong, or what should be done)

Each question must:
- Be based on a real-world situation or deep skill insight
- Focus on one of the skills from the provided list
- Include four options labeled A–D (only one correct)
- Include the correct answer index (0-based)
- Include a brief but clear explanation
- Include question type (conceptual, logical, applied, problem-solving)
- Include difficulty (easy, intermediate, advanced)
- Include skill category

Return a valid JSON array of ${batchSize} questions in this format:
[
  {
    "question": "Question text here",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 1,
    "explanation": "Why this is correct and others aren't",
    "type": "logical",
    "difficulty": "intermediate",
    "skill": "React.js"
  },
  ...
]

Distribute questions across different skills to provide a balanced assessment.
Avoid trivia, vague definitions, or syntax-only questions. Focus on thinking, decision-making, and professional-level skills.`
          },
          {
            role: "user",
            content: `Generate ${batchSize} high-quality MCQs covering these skills: ${skillsString}

Based on the following job description:

${jobDescription}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API Response:", data);
    const content = data.choices[0].message.content;
    
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      let jsonString = content;
      if (content.includes('```json')) {
        jsonString = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonString = content.split('```')[1].split('```')[0].trim();
      }
      
      // Clean up potential JSON issues
      const fixedJson = jsonString.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
      const questions = JSON.parse(fixedJson);
      
      return questions;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw content:", content);
      throw new Error("Failed to parse questions data");
    }
  } catch (error) {
    console.error('Error generating batch MCQs:', error);
    throw error;
  }
}
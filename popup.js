// Cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Load settings when popup opens
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  setDefaultDate();
  getCurrentPageContent();

  // Event listeners
  document.getElementById('toggleSettings').addEventListener('click', toggleSettings);
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('parseBtn').addEventListener('click', parseJobPosting);
  document.getElementById('jobForm').addEventListener('submit', saveToNotion);
});

function getCurrentPageContent() {
  const parseBtn = document.getElementById('parseBtn');
  parseBtn.textContent = 'Loading page content...';
  parseBtn.disabled = true;

  browserAPI.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const activeTab = tabs[0];

    // Execute script to get page text content
    browserAPI.tabs.executeScript(activeTab.id, {
      code: `
        // Get all text content from the page
        (function() {
          // Try to get the main content area, or fall back to body
          const mainContent = document.querySelector('main') ||
                             document.querySelector('article') ||
                             document.querySelector('[role="main"]') ||
                             document.body;

          // Get visible text and the page URL
          return {
            text: mainContent.innerText || mainContent.textContent || '',
            url: window.location.href
          };
        })();
      `
    }, function(results) {
      parseBtn.disabled = false;
      parseBtn.textContent = 'Re-parse Page';

      if (browserAPI.runtime.lastError) {
        console.error('Error extracting page content:', browserAPI.runtime.lastError);
        showMessage('Could not extract page content. Please paste manually.', 'error');
        return;
      }

      if (results && results[0]) {
        const { text, url } = results[0];

        // Set the raw text area with page content
        document.getElementById('rawText').value = text;

        // Also set the URL field
        document.getElementById('link').value = url;

        // Automatically parse the content
        parseJobPosting();
      }
    });
  });
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function loadSettings() {
  browserAPI.storage.local.get(['notionToken', 'databaseId']).then(function(result) {
    if (result.notionToken) {
      document.getElementById('notionToken').value = result.notionToken;
    }
    if (result.databaseId) {
      document.getElementById('databaseId').value = result.databaseId;
    }
  });
}

function saveSettings() {
  const token = document.getElementById('notionToken').value;
  const dbId = document.getElementById('databaseId').value;

  if (!token || !dbId) {
    showMessage('Please fill in both settings fields', 'error');
    return;
  }

  browserAPI.storage.local.set({
    notionToken: token,
    databaseId: dbId
  }).then(function() {
    showMessage('Settings saved successfully', 'success');
    setTimeout(() => {
      document.getElementById('settingsPanel').style.display = 'none';
    }, 1500);
  });
}

function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('applicationDate').value = today;
}

function parseJobPosting() {
  const rawText = document.getElementById('rawText').value.trim();

  if (!rawText) {
    showMessage('Please paste job posting text first', 'error');
    return;
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);

  // Parse company name - look for common patterns
  const companyPatterns = [
    /(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:\s*\n|$|\||•|careers)/i,
    /^company:\s*(.+?)$/im,
    /(?:join|work at|about)\s+([A-Z][A-Za-z0-9\s&.,'-]{2,30})(?:\n|$)/i,
    // Look for "Position at Company" pattern
    /(?:engineer|developer|manager|analyst|specialist|director|lead|designer|coordinator|administrator|architect)\s+(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,'-]+)/i
  ];

  let company = '';
  for (const pattern of companyPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      company = match[1].trim().replace(/\s+/g, ' ');
      // Remove common suffixes
      company = company.replace(/\s+(careers|jobs|hiring|team)$/i, '');
      if (company.length > 3 && company.length < 50) break;
    }
  }

  // Parse position/title - look for job titles in first few lines
  const titleKeywords = [
    'Engineer', 'Developer', 'Manager', 'Analyst', 'Specialist', 'Director',
    'Lead', 'Architect', 'Designer', 'Administrator', 'Coordinator', 'Associate',
    'Consultant', 'Executive', 'Officer', 'Head', 'Principal', 'Staff', 'Senior',
    'Junior', 'Intern', 'Scientist', 'Researcher', 'Technician', 'Representative'
  ];

  let position = '';

  // Check first 5 lines for job title
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Skip very short or very long lines
    if (line.length < 10 || line.length > 100) continue;

    // Check if line contains job title keywords
    const hasKeyword = titleKeywords.some(keyword =>
      new RegExp(`\\b${keyword}\\b`, 'i').test(line)
    );

    if (hasKeyword && !line.toLowerCase().includes('location') &&
        !line.toLowerCase().includes('salary') &&
        !line.toLowerCase().includes('department')) {
      position = line.replace(/^(job\s+title|position|role):\s*/i, '').trim();
      break;
    }
  }

  // Alternative: look for explicit position label
  if (!position) {
    const posMatch = rawText.match(/(?:position|role|job\s+title|title):\s*([^\n]+)/i);
    if (posMatch) position = posMatch[1].trim();
  }

  // Parse location - handle various formats
  const locationPatterns = [
    // "New York, New York, United States" format
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    // "City, State" format
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}(?:\s|$|\n))/,
    // Location: label
    /location:\s*([^\n]+)/i,
    // Remote/Hybrid patterns
    /((?:Remote|Hybrid|On-?site)(?:\s*[-–]\s*[A-Z][a-z]+(?:,\s*[A-Z]{2})?)?)/i
  ];

  let location = '';
  for (const pattern of locationPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      location = match[1].trim();
      // Clean up
      location = location.replace(/\s+/g, ' ').replace(/,$/, '');
      if (location.length > 3) break;
    }
  }

  // Parse salary - handle various formats
  const salaryPatterns = [
    // $172,000 - $215,000 USD
    /\$\s*([\d,]+(?:,\d{3})*)\s*[-–]\s*\$?\s*([\d,]+(?:,\d{3})*)\s*(?:USD|per year|\/year|annually)?/i,
    // $100k - $150k
    /\$\s*(\d+)k\s*[-–]\s*\$?\s*(\d+)k/i,
    // Salary: or Compensation: label
    /(?:salary|compensation|pay)(?:\s+range)?:\s*([^\n]+)/i,
    // Just a single salary
    /\$\s*([\d,]+(?:,\d{3})*)\s*(?:USD|per year|\/year)?/i
  ];

  let salary = '';
  for (const pattern of salaryPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      if (match[2]) {
        // Range format
        salary = `$${match[1]} - $${match[2]}`;
      } else {
        salary = match[0].trim();
      }
      // Clean up excessive whitespace
      salary = salary.replace(/\s+/g, ' ');
      break;
    }
  }

  // Get URL from link field if already set
  const link = document.getElementById('link').value;

  // Populate form fields only if we found something
  if (company) document.getElementById('company').value = company;
  if (position) document.getElementById('position').value = position;
  if (location) document.getElementById('location').value = location;
  if (salary) document.getElementById('salary').value = salary;

  // Show appropriate message
  const foundFields = [company, position, location, salary].filter(f => f).length;
  if (foundFields > 0) {
    showMessage(`Parsed ${foundFields} field(s). Review and edit as needed.`, 'success');
  } else {
    showMessage('Could not auto-parse. Please fill in manually.', 'error');
  }
}

async function saveToNotion(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Get settings
    const settings = await browserAPI.storage.local.get(['notionToken', 'databaseId']);
    
    if (!settings.notionToken || !settings.databaseId) {
      showMessage('Please configure Notion settings first', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save to Notion';
      return;
    }
    
    // Get form values
    const formData = {
      applicationDate: document.getElementById('applicationDate').value,
      company: document.getElementById('company').value,
      position: document.getElementById('position').value,
      link: document.getElementById('link').value,
      location: document.getElementById('location').value,
      salary: document.getElementById('salary').value,
      salaryExpectation: document.getElementById('salaryExpectation').value,
      stage: document.getElementById('stage').value
    };
    
    // Format for Notion API
    const notionData = {
      parent: { database_id: settings.databaseId },
      properties: {
        "Company": {
          title: [{ text: { content: formData.company } }]
        },
        "Position": {
          rich_text: [{ text: { content: formData.position } }]
        },
        "Application Date": {
          date: { start: formData.applicationDate }
        },
        "Stage": {
          status: { name: formData.stage }
        }
      }
    };
    
    // Add optional fields if they exist
    if (formData.link) {
      notionData.properties["Link"] = {
        url: formData.link
      };
    }
    
    if (formData.location) {
      notionData.properties["Location"] = {
        rich_text: [{ text: { content: formData.location } }]
      };
    }
    
    if (formData.salary) {
      notionData.properties["Salary"] = {
        rich_text: [{ text: { content: formData.salary } }]
      };
    }
    
    if (formData.salaryExpectation) {
      notionData.properties["Salary Expectation"] = {
        rich_text: [{ text: { content: formData.salaryExpectation } }]
      };
    }
    
    // Send to Notion
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(notionData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save to Notion');
    }
    
    showMessage('Successfully saved to Notion!', 'success');
    
    // Clear form after successful save
    setTimeout(() => {
      document.getElementById('jobForm').reset();
      document.getElementById('rawText').value = '';
      setDefaultDate();
    }, 1500);
    
  } catch (error) {
    console.error('Error:', error);
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save to Notion';
  }
}

function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}


window.LoadedPlugin = {
    init: function() {
        console.log("Q# Save Feature initialized.");

        // Attempt to find an existing Q# code editor by ID
        let qsharpEditor = document.getElementById('qsharp-code-editor');

        // If no editor is found, create a basic one as a placeholder for demonstration.
        // In a real application, the user would integrate this with their existing editor element.
        if (!qsharpEditor) {
            console.warn("Q# code editor with ID 'qsharp-code-editor' not found. Creating a placeholder.");
            qsharpEditor = document.createElement('textarea');
            qsharpEditor.id = 'qsharp-code-editor';
            qsharpEditor.placeholder = 'Enter your Q# code here...';
            qsharpEditor.style.width = 'calc(100% - 20px)'; // Adjust width for padding/margin
            qsharpEditor.style.height = '200px';
            qsharpEditor.style.padding = '10px';
            qsharpEditor.style.margin = '10px';
            qsharpEditor.style.border = '1px solid #007bff';
            qsharpEditor.style.borderRadius = '8px';
            qsharpEditor.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; // Glassmorphism background
            qsharpEditor.style.color = '#e0e0e0';
            qsharpEditor.style.fontFamily = 'monospace';
            qsharpEditor.style.fontSize = '14px';
            qsharpEditor.style.boxSizing = 'border-box'; // Include padding and border in the element's total width and height

            // Try to find a logical place to append the editor, e.g., a quadrant or main content area
            const mainContentArea = document.querySelector('.quadrant.large') || document.body;
            mainContentArea.appendChild(qsharpEditor);
        }

        // Create the save button
        const saveButton = document.createElement('button');
        saveButton.id = 'save-qsharp-button';
        saveButton.textContent = 'Save Q# File';
        saveButton.style.marginTop = '10px';
        saveButton.style.padding = '10px 20px';
        saveButton.style.background = 'linear-gradient(145deg, #007bff, #0056b3)'; // Glassmorphism button style
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '8px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.boxShadow = '5px 5px 10px rgba(0, 0, 0, 0.3), -5px -5px 10px rgba(255, 255, 255, 0.1)';
        saveButton.style.transition = 'all 0.3s ease';

        // Add hover effects for Glassmorphism
        saveButton.onmouseover = function() {
            this.style.background = 'linear-gradient(145deg, #0056b3, #007bff)';
            this.style.boxShadow = '2px 2px 5px rgba(0, 0, 0, 0.2), -2px -2px 5px rgba(255, 255, 255, 0.05)';
        };
        saveButton.onmouseout = function() {
            this.style.background = 'linear-gradient(145deg, #007bff, #0056b3)';
            this.style.boxShadow = '5px 5px 10px rgba(0, 0, 0, 0.3), -5px -5px 10px rgba(255, 255, 255, 0.1)';
        };

        // Append the button after the editor or in a relevant control area
        if (qsharpEditor.parentNode) {
            qsharpEditor.parentNode.insertBefore(saveButton, qsharpEditor.nextSibling);
        } else {
            document.body.appendChild(saveButton); // Fallback if parent not found
        }

        // Add event listener to the save button
        saveButton.addEventListener('click', function() {
            const codeContent = qsharpEditor.value;
            const fileName = 'my_quantum_program.qs'; // Default filename for Q# programs

            // Create a Blob from the code content with the correct MIME type
            const blob = new Blob([codeContent], { type: 'text/plain;charset=utf-8' });

            // Create a temporary anchor element to trigger the download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName; // Set the download filename

            // Append the link to the document, programmatically click it, then remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Revoke the object URL to release resources
            URL.revokeObjectURL(link.href);
            console.log(`Q# file '${fileName}' saved successfully.`);
        });
    }
};

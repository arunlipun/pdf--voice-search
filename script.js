document.addEventListener('DOMContentLoaded', () => {
    const pdfInput = document.getElementById('pdfInput');
    const showPdfButton = document.getElementById('showPdf');
    const voiceSearchButton = document.getElementById('voiceSearch');
    const textSearchInput = document.getElementById('textSearch');
    const searchButton = document.getElementById('searchButton');
    const pdfViewer = document.getElementById('pdfViewer');
    const searchResults = document.getElementById('searchResults');
    const zoomInButton = document.getElementById('zoomIn');
    const zoomOutButton = document.getElementById('zoomOut');

    let pdfDoc = null;
    let pdfUrl = '';
    let scale = 1.5;

    // Load the PDF
    pdfInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (e) => {
                pdfUrl = e.target.result;
                loadPdf(pdfUrl);
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload a valid PDF file.');
        }
    });

    showPdfButton.addEventListener('click', () => {
        if (pdfUrl) {
            loadPdf(pdfUrl);
        } else {
            alert('Please upload a PDF first.');
        }
    });

    voiceSearchButton.addEventListener('click', () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Your browser does not support Speech Recognition');
            return;
        }
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
            const keyword = event.results[0][0].transcript.trim();
            searchKeyword(keyword);
        };
        recognition.onerror = (event) => {
            alert('Error: ' + event.error);
        };
        recognition.start();
    });

    searchButton.addEventListener('click', () => {
        const keyword = textSearchInput.value.trim();
        if (keyword) {
            searchKeyword(keyword);
        }
    });

    zoomInButton.addEventListener('click', () => {
        scale += 0.2;
        if (pdfUrl) loadPdf(pdfUrl);
    });

    zoomOutButton.addEventListener('click', () => {
        scale = Math.max(0.5, scale - 0.2);
        if (pdfUrl) loadPdf(pdfUrl);
    });

    function loadPdf(url) {
        pdfjsLib.getDocument(url).promise.then((pdf) => {
            pdfDoc = pdf;
            renderAllPages();
        }).catch(err => console.error(err));
    }

    function renderAllPages() {
        pdfViewer.innerHTML = '';
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            pdfDoc.getPage(pageNum).then(page => {
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                page.render(renderContext);
                pdfViewer.appendChild(canvas);
            });
        }
    }

    function searchKeyword(keyword) {
        if (!pdfDoc) {
            alert('Load a PDF first!');
            return;
        }

        searchResults.innerHTML = '<h3>Search Results:</h3>';

        const searchPromises = [];

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            searchPromises.push(
                pdfDoc.getPage(pageNum).then(page =>
                    page.getTextContent().then(textContent => {
                        const text = textContent.items.map(item => item.str).join(' ').toLowerCase();
                        if (text.includes(keyword.toLowerCase())) {
                            return { pageNum, page, textContent };
                        }
                    })
                )
            );
        }

        Promise.all(searchPromises).then(results => {
            const foundPages = results.filter(Boolean);

            if (foundPages.length === 0) {
                searchResults.innerHTML += `<p>No matches found for "${keyword}".</p>`;
            } else {
                foundPages.forEach(result => {
                    const link = document.createElement('div');
                    link.classList.add('result-item');
                    link.textContent = `Page ${result.pageNum}`;
                    link.style.cursor = 'pointer';
                    link.onclick = () => scrollToPage(result.pageNum);
                    searchResults.appendChild(link);

                    highlightPage(result.pageNum, result.textContent, keyword);
                });
            }
        }).catch(error => console.error('Error during search:', error));
    }

    function scrollToPage(pageNum) {
        const canvases = pdfViewer.querySelectorAll('canvas');
        const canvas = canvases[pageNum - 1];
        if (canvas) {
            canvas.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function highlightPage(pageNum, textContent, keyword) {
        const canvas = pdfViewer.querySelectorAll('canvas')[pageNum - 1];
        const context = canvas.getContext('2d');

        textContent.items.forEach(item => {
            if (item.str.toLowerCase().includes(keyword.toLowerCase())) {
                const x = item.transform[4];
                const y = canvas.height - item.transform[5];
                context.fillStyle = 'rgba(255, 255, 0, 0.5)';
                context.fillRect(x, y - 10, item.width, 10);
            }
        });
    }
});

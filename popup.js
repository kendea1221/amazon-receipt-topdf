document.getElementById('download-button').addEventListener('click', () => {
    const fileInput = document.getElementById('file-input');
    const statusDiv = document.getElementById('status');
    const urlListDiv = document.getElementById('url-list');
    const previewDiv = document.getElementById('preview');

    if (fileInput.files.length === 0) {
        statusDiv.textContent = 'CSVファイルを選択してください。';
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(event) {
        const csvData = event.target.result;
        const rows = csvData.split('\n');
        const orderIds = rows.slice(1).map(row => row.split(',')[0].trim());

        statusDiv.textContent = 'ダウンロード中...';
        urlListDiv.innerHTML = ''; // URLリストをクリア
        previewDiv.innerHTML = ''; // プレビューをクリア

        const pdfContents = []; // PDFに追加するHTML内容を格納する配列

        for (const orderId of orderIds) {
            try {
                const receiptUrl = `https://www.amazon.co.jp/gp/css/summary/print.html/ref=oh_aui_ajax_invoice?ie=UTF8&orderID=${orderId}`;
                const response = await fetch(receiptUrl, {
                    method: 'GET',
                    credentials: 'include' // Cookieを送信
                });

                if (!response.ok) {
                    throw new Error(`Error fetching receipt for order ID ${orderId}: ${response.statusText}`);
                }

                const htmlContent = await response.text();
                const contentDiv = document.createElement('div');
                contentDiv.innerHTML = htmlContent; // HTMLをDivに設定

                // プレビューを表示
                previewDiv.innerHTML += `<div class="preview-container">${htmlContent}</div>`;
                
                // PDF用のHTML内容を追加
                pdfContents.push(contentDiv.innerHTML);

                const urlItem = document.createElement('div');
                urlItem.textContent = `領収書ダウンロード完了: ${receiptUrl}`;
                urlListDiv.appendChild(urlItem);
            } catch (error) {
                console.error(error);
                statusDiv.textContent = `エラー: ${error.message}`;
                return; // エラーが発生したら処理を中止
            }
        }

        // PDFを生成
        await downloadPDF(pdfContents);

        statusDiv.textContent = 'ダウンロード完了';
    };

    reader.readAsText(file); // CSVファイルをテキストとして読み込む
});

// PDFをダウンロードする関数
async function downloadPDF(contents) {
    const pdfContainer = document.createElement('div');

    contents.forEach((content, index) => {
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;
        pdfContainer.appendChild(contentDiv);

        // 新しいページを追加
        const pageBreak = document.createElement('div');
        pageBreak.style.pageBreakAfter = 'always'; // 次の領収書のためにページブレイクを設定
        pdfContainer.appendChild(pageBreak);
    });

    // html2pdfを使ってPDFを生成
    const options = {
        margin:       0.5,
        filename:     `receipts_${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        await html2pdf().from(pdfContainer).set(options).save(); // PDFを保存
    } catch (err) {
        console.error("PDF生成中にエラーが発生しました:", err);
        throw new Error("PDF生成中にエラーが発生しました");
    }
}
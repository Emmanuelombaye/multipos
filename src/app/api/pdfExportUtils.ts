import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFReportData {
    title: string;
    subtitle?: string;
    summaryCards: { label: string; value: string }[];
    tables: {
        title: string;
        headers: string[];
        rows: any[][];
    }[];
}

export const exportToPDF = (data: PDFReportData, filename: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFillColor(185, 28, 28); // red-700
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('EdenDropInvestment', 14, 20);

    doc.setFontSize(14);
    doc.text(data.title, 14, 32);
    if (data.subtitle) {
        doc.setFontSize(10);
        doc.text(data.subtitle, pageWidth - 14, 32, { align: 'right' });
    }

    let currentY = 55;

    // Summary Cards
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    const cardWidth = (pageWidth - 28) / data.summaryCards.length;

    data.summaryCards.forEach((card, i) => {
        const x = 14 + i * cardWidth;
        doc.setFont('helvetica', 'bold');
        doc.text(card.label.toUpperCase(), x, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(card.value, x, currentY + 8);
    });

    currentY += 25;

    // Tables
    data.tables.forEach((table) => {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(table.title, 14, currentY);
        currentY += 5;

        autoTable(doc, {
            startY: currentY,
            head: [table.headers],
            body: table.rows,
            theme: 'striped',
            headStyles: { fillColor: [185, 28, 28] }, // red-700
            margin: { left: 14, right: 14 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    doc.save(`${filename}.pdf`);
};

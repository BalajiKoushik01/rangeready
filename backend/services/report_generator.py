from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.graphics.shapes import Drawing, String, Line, Rect
from reportlab.lib.units import inch
from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
import os
import io
import datetime
from sqlalchemy.orm import Session
from models.test_session import TestSession, TestStep
import matplotlib.pyplot as plt

class ReportGenerator:
    """
    Handles PDF and Excel report generation for RangeReady.
    """

    def __init__(self, session_id: int, db: Session):
        self.session_id = session_id
        self.db = db
        self.session_data = self.db.query(TestSession).filter(TestSession.id == self.session_id).first()

    def generate_pdf(self, output_path: str):
        """
        Generates an ISRO-compliant PDF report.
        """
        if not self.session_data:
            raise ValueError(f"Session {self.session_id} not found.")

        doc = SimpleDocTemplate(output_path, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []

        # 1. Cover Page
        elements.append(Spacer(1, 2 * inch))
        title_style = ParagraphStyle(
            'TitleStyle', parent=styles['Heading1'], fontSize=24, 
            alignment=1, spaceAfter=20, textColor=colors.HexColor("#1A1814")
        )
        elements.append(Paragraph("RF COMPONENT TEST REPORT", title_style))
        elements.append(Spacer(1, 0.5 * inch))
        
        # Summary details table
        data = [
            ["DUT Name:", self.session_data.dut_name],
            ["DUT Serial:", self.session_data.dut_serial],
            ["Test Date:", self.session_data.timestamp.strftime("%Y-%m-%d %H:%M:%S")],
            ["Engineer:", self.session_data.engineer_name],
            ["Overall Result:", Paragraph(f'<b><font color="{colors.green if self.session_data.overall_result == "PASS" else colors.red}">{self.session_data.overall_result}</font></b>', styles['Normal'])]
        ]
        t = Table(data, colWidths=[1.5*inch, 3*inch])
        t.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 12),
            ('ALIGN', (0,0), (0,-1), 'RIGHT'),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ]))
        elements.append(t)
        
        elements.append(PageBreak())

        # 2. Results Summary Table
        elements.append(Paragraph("Test Results Summary", styles['Heading2']))
        elements.append(Spacer(1, 0.2 * inch))
        
        summary_data = [["Step #", "Measurement", "Value", "Limit", "Result"]]
        for step in self.session_data.steps:
            result_label = "PASS" if step.pass_fail else "FAIL"
            summary_data.append([
                step.step_number,
                step.measurement_type,
                f"{step.result_value:.2f} dB" if step.result_value else "N/A",
                f"< {step.upper_limit} dB" if step.upper_limit else "N/A",
                Paragraph(f'<font color="{colors.green if step.pass_fail else colors.red}">{result_label}</font>', styles['Normal'])
            ])
            
        summary_table = Table(summary_data, colWidths=[0.8*inch, 1.5*inch, 1.2*inch, 1*inch, 1*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F8F7F4")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#1A1814")),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey)
        ]))
        elements.append(summary_table)
        elements.append(PageBreak())

        # 3. Detailed Step Results (Charts)
        for step in self.session_data.steps:
            elements.append(Paragraph(f"Step {step.step_number}: {step.name}", styles['Heading2']))
            elements.append(Spacer(1, 0.1 * inch))
            
            # Generate chart using Matplotlib and embed it
            chart_img = self._generate_step_chart(step)
            img = Image(chart_img, width=6*inch, height=3*inch)
            elements.append(img)
            
            # Metrics below chart
            metrics_data = [["Property", "Value"]]
            metrics_data.append(["Min Val:", f"{step.result_value:.2f} dB"])
            metrics_data.append(["Center:", f"{(step.start_freq_hz + step.stop_freq_hz)/2e6:.1f} MHz"])
            metrics_data.append(["Span:", f"{(step.stop_freq_hz - step.start_freq_hz)/2e6:.1f} MHz"])
            
            metrics_table = Table(metrics_data, colWidths=[1.5*inch, 2*inch])
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8F7F4")),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey)
            ]))
            elements.append(metrics_table)
            elements.append(PageBreak())

        doc.build(elements)

    def generate_excel(self, output_path: str):
        """
        Generates an Excel workbook with raw trace data and charts.
        """
        if not self.session_data:
            return

        wb = Workbook()
        summary_sheet = wb.active
        summary_sheet.title = "Summary"
        
        # Summary Header
        summary_sheet.append(["DUT Name", self.session_data.dut_name])
        summary_sheet.append(["DUT Serial", self.session_data.dut_serial])
        summary_sheet.append(["Overall Result", self.session_data.overall_result])
        summary_sheet.append([])
        summary_sheet.append(["Step", "Name", "Type", "Result Value", "Pass/Fail"])
        
        for step in self.session_data.steps:
            summary_sheet.append([
                step.step_number, step.name, step.measurement_type, 
                step.result_value, "PASS" if step.pass_fail else "FAIL"
            ])
            
            # Create a separate sheet for each step's trace data
            ws = wb.create_sheet(title=f"Step {step.step_number}")
            ws.append(["Frequency (Hz)", "Amplitude (dB)"])
            for f, a in zip(step.frequencies_hz, step.amplitudes_db):
                ws.append([f, a])
                
        wb.save(output_path)

    def _generate_step_chart(self, step: TestStep) -> io.BytesIO:
        """
        Renders an RF trace chart using Matplotlib for embedding in PDFs.
        """
        plt.figure(figsize=(10, 5))
        plt.style.use('bmh') # Clean mathematical style
        
        # Main trace
        plt.plot(np.array(step.frequencies_hz)/1e6, step.amplitudes_db, color='#1E6FD9', linewidth=1.5)
        
        # Frequency labels in MHz
        plt.title(f"{step.measurement_type} Response", fontname='sans-serif', fontsize=12)
        plt.xlabel("Frequency (MHz)", fontsize=10)
        plt.ylabel("Magnitude (dB)", fontsize=10)
        
        # Limits
        if step.upper_limit:
            plt.axhline(y=step.upper_limit, color='#DC2626', linestyle='--', linewidth=1, label=f'Limit ({step.upper_limit}dB)')
            
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150)
        plt.close()
        buf.seek(0)
        return buf

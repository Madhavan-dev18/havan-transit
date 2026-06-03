import os
from celery import shared_task
from django.conf import settings
from .models import Booking

# ReportLab Structural Layout Components
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.graphics.barcode import createBarcodeDrawing

@shared_task
def generate_and_send_ticket(booking_id):
    try:
        # 1. Retrieve the live transaction row from database
        booking = Booking.objects.get(id=booking_id)
        bus = booking.bus
        user = booking.user
        
        print(f"\n[CELERY WORKER] 📄 Compiling premium boarding pass for Ticket: {booking.ticket_id}")

        # 2. Establish isolated destination directory on the filesystem
        tickets_dir = os.path.join(settings.BASE_DIR, 'generated_tickets')
        os.makedirs(tickets_dir, exist_ok=True)
        pdf_filename = f"Ticket_{booking.ticket_id}.pdf"
        pdf_path = os.path.join(tickets_dir, pdf_filename)

        # 3. Initialize Layout Document Specifications
        doc = SimpleDocTemplate(
            pdf_path, 
            pagesize=letter,
            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
        )
        
        story = []
        styles = getSampleStyleSheet()

        # Havan Bus Brand Colors (Mapped to React Frontend)
        primary_blue = colors.HexColor('#0052cc')
        dark_slate = colors.HexColor('#0f172a')
        light_slate = colors.HexColor('#64748b')
        success_green = colors.HexColor('#16a34a')
        seal_bg = colors.HexColor('#f0fdf4')

        # Typography Style Matrix Configuration
        title_style = ParagraphStyle(
            'TicketTitle',
            parent=styles['Heading1'],
            fontSize=26,
            leading=26,
            textColor=primary_blue,
            fontName='Helvetica-Bold',
            spaceAfter=0
        )
        
        subtitle_style = ParagraphStyle(
            'TicketSubTitle',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            textColor=light_slate,
            fontName='Helvetica-Bold',
            textTransform='uppercase'
        )

        header_right = ParagraphStyle(
            'HeaderRight',
            parent=styles['Normal'],
            fontSize=10,
            textColor=light_slate,
            alignment=2 # Right Align
        )
        
        meta_style = ParagraphStyle('TicketMeta', parent=styles['Normal'], fontSize=9, leading=13, textColor=light_slate)
        header_style = ParagraphStyle('TableHeader', parent=styles['Normal'], fontSize=10, leading=12, textColor=colors.white, fontName='Helvetica-Bold')
        cell_bold = ParagraphStyle('CellBold', parent=styles['Normal'], fontSize=10, leading=12, fontName='Helvetica-Bold', textColor=dark_slate)
        cell_normal = ParagraphStyle('CellNormal', parent=styles['Normal'], fontSize=10, leading=12, textColor=dark_slate)

        # 4. Construct Top Branding Header & Barcode
        # Extract an 8-character PNR segment from the UUID for the barcode
        pnr_code = str(booking.ticket_id).split('-')[0].upper()
        barcode = createBarcodeDrawing('Code128', value=pnr_code, width=160, height=35)
        
        header_data = [
            [Paragraph("HAVAN BUS", title_style), barcode],
            [Paragraph("Official E-Ticket & Boarding Pass", subtitle_style), Paragraph(f"<b>PNR:</b> {pnr_code}", header_right)]
        ]
        header_table = Table(header_data, colWidths=[330, 200])
        header_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, 1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))

        # 5. Dashed "Tear-Away" Cut Line
        story.append(HRFlowable(width="100%", thickness=1.5, lineCap='round', color=light_slate, spaceBefore=5, spaceAfter=15, hAlign='CENTER', vAlign='BOTTOM', dash=(6, 4)))

        # 6. Build General Trip Details Section
        itinerary_data = [
            [Paragraph('Route & Itinerary Specifications', header_style), ''],
            [Paragraph('Bus Service Name:', cell_bold), Paragraph(bus.bus_name, cell_normal)],
            [Paragraph('Transit Path Route:', cell_bold), Paragraph(f"{bus.source} to {bus.dest}", cell_normal)],
            [Paragraph('Departure Calendar Date:', cell_bold), Paragraph(str(bus.date), cell_normal)],
            [Paragraph('Scheduled Departure Time:', cell_bold), Paragraph(str(bus.time), cell_normal)],
        ]

        itinerary_table = Table(itinerary_data, colWidths=[160, 370])
        itinerary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), primary_blue),
            ('SPAN', (0, 0), (1, 0)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        story.append(itinerary_table)
        story.append(Spacer(1, 15))

        # 7. Build Dynamic Passenger Manifest Grid
        story.append(Paragraph("Verified Passenger Manifest", ParagraphStyle('SubHeader', parent=subtitle_style, textColor=dark_slate)))
        story.append(Spacer(1, 6))
        
        manifest_data = [
            [
                Paragraph('Seat Number', header_style), 
                Paragraph('Legal Passenger Name', header_style), 
                Paragraph('Age', header_style), 
                Paragraph('Gender', header_style)
            ]
        ]
        
        for passenger in booking.passenger_details:
            manifest_data.append([
                Paragraph(passenger.get('seat', 'N/A'), cell_bold),
                Paragraph(passenger.get('name', 'N/A'), cell_normal),
                Paragraph(str(passenger.get('age', 'N/A')), cell_normal),
                Paragraph(passenger.get('gender', 'N/A'), cell_normal),
            ])
            
        manifest_table = Table(manifest_data, colWidths=[100, 250, 80, 100])
        manifest_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), dark_slate),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        story.append(manifest_table)
        story.append(Spacer(1, 15))

        # 8. Build Financial Transaction Overview Grid
        receipt_data = [
            [Paragraph('Financial Ledger Statement', header_style), ''],
            [Paragraph('Total Seats Reserved:', cell_bold), Paragraph(f"{booking.seats_booked} Slot(s) [ {', '.join(booking.selected_seats)} ]", cell_normal)],
            [Paragraph('Base Fare Rate:', cell_bold), Paragraph(f"INR {bus.price}", cell_normal)],
            [Paragraph('Total Gross Remittance:', cell_bold), Paragraph(f"INR {booking.total_price}", ParagraphStyle('GreenText', parent=cell_bold, textColor=success_green))]
        ]
        
        receipt_table = Table(receipt_data, colWidths=[160, 370])
        receipt_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), light_slate),
            ('SPAN', (0, 0), (1, 0)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        story.append(receipt_table)
        story.append(Spacer(1, 30))

        # 9. Official Verification Seal
        seal_style = ParagraphStyle(
            'SealText',
            parent=styles['Normal'],
            fontSize=14,
            leading=18,
            textColor=success_green,
            fontName='Helvetica-Bold',
            alignment=1 # Center
        )
        
        seal_data = [
            [Paragraph(f"HAVAN BUS DIGITAL VERIFICATION<br/>★ AUTHENTICATED & CONFIRMED ★<br/><font size=8 color='#64748b'>TS: {booking.booked_on.strftime('%Y-%m-%d %H:%M:%S')} | ID: {str(booking.ticket_id)}</font>", seal_style)]
        ]
        seal_table = Table(seal_data, colWidths=[400], rowHeights=[65])
        seal_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 2.5, success_green),
            ('BACKGROUND', (0, 0), (-1, -1), seal_bg),
        ]))
        
        # Wrap seal in another table just to center it perfectly on the page
        center_seal = Table([[seal_table]], colWidths=[530])
        center_seal.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
        story.append(center_seal)
        
        story.append(Spacer(1, 30))

        # 10. Compliance / Security Legal Notice footer
        story.append(Paragraph("<b>Regulatory Notice:</b> This document constitutes an absolute digital ticket confirmation license generated by the Havan Bus secure execution layer. Passengers must present this digital printout alongside matching government-issued identity credentials (Aadhaar / Driving License) at the gate terminal prior to boarding.", meta_style))

        # Compile Layout and Lock Binary stream asset to disk
        doc.build(story)
        print(f"[CELERY WORKER] ✅ Stream compilation success. Asset locked to filesystem location: {pdf_path}\n")
        return pdf_path

    except Booking.DoesNotExist:
        print(f"[CELERY WORKER] ❌ Execution Aborted: Target Booking ID {booking_id} row is missing.")
        return None
    except Exception as e:
        print(f"[CELERY WORKER] ❌ Layout Compilation Fault: {str(e)}")
        return None
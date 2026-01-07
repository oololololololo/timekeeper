import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { meetingId, meetingName, participants, startDate, endDate, adminEmail } = body

    if (!participants || !participants.length) {
      return NextResponse.json({ message: 'No participants to email' }, { status: 200 })
    }

    // Check credentials
    const user = process.env.ZOHO_USER
    const pass = process.env.ZOHO_PASS

    if (!user || !pass) {
      console.warn('Missing Zoho credentials. Skipping email.')
      return NextResponse.json({ message: 'Missing credentials' }, { status: 200 }) // Don't break frontend
    }

    // Configure Transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: { user, pass }
    })

    // Email Template Generator
    const generateHtml = (name: string, isSpeaker: boolean, identityIndex?: number) => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      const linkPath = isSpeaker ? 'speaker' : 'admin'
      const queryParam = identityIndex !== undefined ? `?identity=${identityIndex}` : ''
      const fullLink = `${baseUrl}/${meetingId}/${linkPath}${queryParam}`

      const costSection = body.costData ? `
            <div style="background-color: #2e2e48; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4ade80;">
                <h3 style="margin-top: 0; color: #4ade80;">💰 Impacto de la Reunión</h3>
                ${body.costData.objective ? `<p style="margin: 5px 0;"><strong>🎯 Objetivo:</strong> ${body.costData.objective}</p>` : ''}
                <p style="margin: 5px 0;"><strong>📉 Costo Empresa:</strong> ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(body.costData.totalCost)}</p>
                ${body.costData.returnText ? `<p style="margin: 5px 0;"><strong>📈 Retorno Estimado:</strong> ${body.costData.returnText}</p>` : ''}
                <p style="margin-top: 15px; font-weight: bold; color: white;">¡TU COMPROMISO VALE!</p>
            </div>
            ` : ''

      return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #667eea; padding: 20px; text-align: center;">
          <h1 style="margin: 0; color: white;">TimeKeeper</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #667eea; margin-top: 0;">Invitación a Reunión</h2>
          <p>Hola <strong>${name}</strong>,</p>
          <p>Has sido invitado a participar en la reunión <strong>"${meetingName}"</strong>.</p>
          
          <div style="background-color: #2e2e48; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;">📅 <strong>Inicio:</strong> ${new Date(startDate).toLocaleString('es-CL')}</p>
            ${endDate ? `<p style="margin: 5px 0;">🏁 <strong>Fin:</strong> ${new Date(endDate).toLocaleString('es-CL')}</p>` : ''}
          </div>

          ${costSection}

          <div style="text-align: center; margin-top: 30px;">
            <a href="${fullLink}" 
               style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               ${isSpeaker ? 'Abrir Vista de Orador' : 'Abrir Panel de Control'}
            </a>
          </div>
          
          <p style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">
            Enlace directo: <br>
            <a href="${fullLink}" style="color: #667eea;">
              ${fullLink}
            </a>
          </p>
        </div>
      </div>
    `
    }

    // Send emails in parallel
    const promises = participants.map((p: any, i: number) => {
      if (p.email && p.email.includes('@')) {
        return transporter.sendMail({
          from: `"TimeKeeper" <${user}>`,
          to: p.email,
          subject: `Invitación: ${meetingName}`,
          html: generateHtml(p.name, true, i)
        })
      }
    }).filter(Boolean)

    // Also send to admin if provided
    if (adminEmail) {
      promises.push(
        transporter.sendMail({
          from: `"TimeKeeper" <${user}>`,
          to: adminEmail,
          subject: `Admin: ${meetingName}`,
          html: generateHtml('Organizador', false)
        })
      )
    }

    await Promise.all(promises)

    return NextResponse.json({ success: true, count: promises.length })
  } catch (error: any) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

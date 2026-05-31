import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, prompt } = await req.json()

  const FAL_KEY = process.env.FAL_KEY
  if (!FAL_KEY) {
    return NextResponse.json({ error: 'FAL_KEY not set' }, { status: 500 })
  }

  const response = await fetch('https://fal.run/fal-ai/image-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: `data:image/jpeg;base64,${imageBase64}`,
      prompt: prompt ?? 'full body anime avatar, standing pose, white background, character design, clean illustration, full body from head to toe',
      negative_prompt: 'cropped, cut off, partial body, bad anatomy',
      strength: 0.75,
      num_inference_steps: 28,
      guidance_scale: 7.5,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json({ error: data }, { status: response.status })
  }

  return NextResponse.json({ imageUrl: data.images?.[0]?.url ?? data.image?.url ?? null })
}

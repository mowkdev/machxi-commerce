import { Construction } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type PlaceholderPageProps = {
  title: string
  description?: string
}

export function PlaceholderPage({
  title,
  description = "This section is not implemented yet. Check back later.",
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-var(--header-height,3rem))] w-full max-w-2xl items-center justify-center p-4 md:p-6">
      <Card className="w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex justify-center">
            <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
              <Construction className="size-7" aria-hidden />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="text-balance text-base">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

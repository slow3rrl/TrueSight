import React, { useState } from "react"
import { useNavigate } from "react-router"
import { ArrowLeft, Check, Copy, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Card, CardContent } from "../../components/ui/Card"
import { generateUniqueClassCode } from "../../utils/ClassCode"
import { MOCK_CLASSES } from "../../data"
import { toast } from "sonner"

export function CreateClassPage() {
  const navigate = useNavigate()
  const [className, setClassName] = useState("")
  const [courseCode, setCourseCode] = useState("")
  const [description, setDescription] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [copied, setCopied] = useState(false)

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()

    // Generate unique class code
    const existingCodes = MOCK_CLASSES.map(c => c.code)
    const newCode = generateUniqueClassCode(existingCodes)
    setGeneratedCode(newCode)

    // In a real app, this would save to the backend
    toast.success("Class created successfully!")
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    toast.success("Class code copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-950 min-h-screen p-4 flex flex-col transition-colors duration-500">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Create Class</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="flex-1 shadow-sm border-0 rounded-3xl overflow-hidden mb-6 bg-white dark:bg-slate-800 transition-colors">
          <CardContent className="p-6">
            {!generatedCode ? (
              <form onSubmit={handleGenerate} className="space-y-6 flex flex-col h-full">
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Class Name</label>
                    <Input
                      placeholder="e.g. Artificial Intelligence"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                      required
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Course Code</label>
                    <Input
                      placeholder="e.g. IT 301"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                      required
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Description</label>
                    <textarea
                      placeholder="Brief description of the class..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                      required
                    />
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="mt-auto pt-8"
                >
                  <Button type="submit" className="w-full h-14 rounded-xl text-base shadow-md shadow-blue-600/20 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Class Code
                  </Button>
                </motion.div>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center h-full text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 flex items-center justify-center mb-6"
                >
                  <Check className="w-10 h-10" />
                </motion.div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Class Created!</h2>
                <p className="text-gray-500 dark:text-slate-400 mb-2 max-w-[280px]">
                  Share this code with your students so they can join.
                </p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mb-8 max-w-[280px]">
                  {className} • {courseCode}
                </p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl p-6 w-full mb-8 relative group"
                >
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Class Code</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold tracking-widest text-blue-900 dark:text-blue-300">
                      {generatedCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </motion.div>

                <div className="w-full space-y-3 mt-auto">
                  <Button
                    className="w-full h-14 rounded-xl text-base shadow-md shadow-blue-600/20 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600"
                    onClick={() => navigate("/teacher")}
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-14 rounded-xl text-base border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGeneratedCode("")
                      setClassName("")
                      setCourseCode("")
                      setDescription("")
                    }}
                  >
                    Create Another Class
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

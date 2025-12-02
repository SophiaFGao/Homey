
import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Hammer, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  Download, 
  RefreshCw,
  ImageIcon,
  CheckCircle,
  Gift,
  ArrowRight,
  ChevronRight,
  Leaf,
  Loader2,
  X,
  MessageCircle,
  Send,
  Minimize2
} from 'lucide-react';
import { StyleOption, CategoryOption, GeneratedResult, SurpriseResult, ChatMessage, ProjectPlan } from './types';
import { 
  generateProjectPlan, 
  generateInspirationImages, 
  generateSurpriseAnalysis, 
  generateSurpriseImages,
  generateStepImage,
  analyzeStyleFromImage,
  sendProjectChat
} from './services/geminiService';

// Explicitly define styles to ensure they always render correctly
const PRESET_STYLES = [
  StyleOption.Transitional,
  StyleOption.Japandi,
  StyleOption.MidCentury,
  StyleOption.OrganicModern,
  StyleOption.Farmhouse,
  StyleOption.InstaTrendy
];

// --- Sub-component for generating step illustrations ---
const StepIllustration: React.FC<{ description: string; style: string }> = ({ description, style }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchImage = async () => {
      // Small delay to prevent all triggering instantly if many steps
      await new Promise(r => setTimeout(r, Math.random() * 1500));
      if (!mounted) return;
      
      const img = await generateStepImage(description, style);
      if (mounted) {
        if (img) {
          setImageUrl(img);
        } else {
          setHasError(true);
        }
        setLoading(false);
      }
    };
    fetchImage();
    return () => { mounted = false; };
  }, [description, style]);

  if (hasError) return null;

  if (loading) {
    return (
      <div className="my-6 w-full max-w-xs h-48 bg-stone-100 rounded-2xl flex flex-col items-center justify-center border border-stone-200 animate-pulse">
        <Loader2 className="animate-spin text-stone-300 mb-2" size={24} />
        <span className="text-xs text-stone-400 font-medium">Visualizing step...</span>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="my-6 relative group inline-block">
      <img 
        src={`data:image/jpeg;base64,${imageUrl}`} 
        alt={description}
        className="w-full max-w-xs h-48 object-cover rounded-2xl shadow-md border border-stone-100 transition-transform group-hover:scale-[1.02]"
      />
      <div className="absolute bottom-2 left-2 bg-white/80 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-stone-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        AI Generated
      </div>
    </div>
  );
};

// --- Chat Widget Component ---
const ChatWidget: React.FC<{ plan: ProjectPlan }> = ({ plan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm Homey. Need clarification on any steps or materials?" }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const responseText = await sendProjectChat(plan, messages, input);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I ran into a snag. Could you try asking again?" }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen ? (
        <div className="bg-white rounded-3xl shadow-2xl shadow-stone-900/10 border border-stone-200 w-80 md:w-96 flex flex-col overflow-hidden animate-slide-up h-[500px]">
          {/* Header */}
          <div className="bg-stone-900 text-stone-50 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-full">
                <Hammer size={14} className="text-orange-400" />
              </div>
              <div>
                <h4 className="font-display text-lg leading-none">Homey Chat</h4>
                <span className="text-[10px] text-stone-400 font-sans tracking-wide uppercase">Assistant Active</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <Minimize2 size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-stone-50">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`
                    max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-stone-200 text-stone-900 rounded-br-none' 
                      : 'bg-white text-stone-700 border border-stone-200 rounded-bl-none shadow-sm'
                    }
                  `}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                 <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-stone-200 shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce delay-200"></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-stone-200">
            <div className="flex items-center gap-2 bg-stone-100 rounded-full px-4 py-2 border border-transparent focus-within:border-stone-300 focus-within:bg-white transition-all">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about steps, tools..." 
                className="bg-transparent flex-grow outline-none text-sm text-stone-800 placeholder-stone-400"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className={`p-2 rounded-full transition-all ${input.trim() ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400'}`}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-stone-900 hover:bg-stone-800 text-white p-4 rounded-full shadow-2xl shadow-stone-900/20 transition-all hover:scale-110 flex items-center gap-3 pr-6 group"
        >
          <div className="relative">
            <MessageCircle size={24} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 border-2 border-stone-900 rounded-full"></span>
          </div>
          <span className="font-display text-lg hidden group-hover:block animate-fade-in">Ask Homey</span>
        </button>
      )}
    </div>
  );
};

const App: React.FC = () => {
  // State
  const [step, setStep] = useState<'upload' | 'analyzing' | 'results' | 'error'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [inspirationImage, setInspirationImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(StyleOption.Transitional);
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(CategoryOption.FurnitureFlipping);
  const [resultData, setResultData] = useState<GeneratedResult | SurpriseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const resultsRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const vibeRef = useRef<HTMLDivElement>(null);

  // Handlers for Source Image
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage((reader.result as string).split(',')[1]);
        // Auto scroll to next section
        setTimeout(() => categoryRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage((reader.result as string).split(',')[1]);
        setTimeout(() => categoryRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handlers for Inspiration Image
  const handleInspirationUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInspirationImage((reader.result as string).split(',')[1]);
        setSelectedStyle(''); // Clear standard style
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInspirationDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInspirationImage((reader.result as string).split(',')[1]);
        setSelectedStyle('');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearInspirationImage = () => {
    setInspirationImage(null);
    setSelectedStyle(StyleOption.Transitional);
  };

  const handleStyleSelect = (style: string) => {
    setSelectedStyle(style);
    setInspirationImage(null);
  };

  const generateFullPlan = async (style: string, initialImage?: string) => {
    if (!selectedImage) return;
    setStep('analyzing');
    setErrorMessage('');
    
    try {
      const plan = await generateProjectPlan(selectedImage, style, selectedCategory);
      let images: string[] = [];

      if (initialImage) {
         const additionalImages = await generateInspirationImages(style, selectedCategory, plan.itemDescription, ["slightly angled view", "detail focused view"]);
         images = [initialImage, ...additionalImages];
      } else {
        images = await generateInspirationImages(style, selectedCategory, plan.itemDescription);
      }

      setResultData({ type: 'standard', plan, inspirationImages: images });
      setStep('results');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Something went wrong.");
      setStep('error');
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) return;

    if (inspirationImage) {
      setStep('analyzing');
      setErrorMessage('');
      try {
        const derivedStyle = await analyzeStyleFromImage(inspirationImage);
        setSelectedStyle(derivedStyle);
        await generateFullPlan(derivedStyle);
        return;
      } catch (error: any) {
        setErrorMessage(error.message || "Failed to analyze inspiration image.");
        setStep('error');
        return;
      }
    }

    if (selectedStyle === StyleOption.SurpriseMe) {
      setStep('analyzing');
      setErrorMessage('');
      try {
        const analysis = await generateSurpriseAnalysis(selectedImage, selectedCategory);
        const suggestions = await generateSurpriseImages(analysis.styles, selectedCategory, analysis.itemDescription);
        setResultData({ type: 'surprise', itemDescription: analysis.itemDescription, suggestions });
        setStep('results');
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch (error: any) {
        setErrorMessage(error.message);
        setStep('error');
      }
    } else {
      await generateFullPlan(selectedStyle);
    }
  };

  const handleSurpriseSelection = async (style: string, image: string) => {
    await generateFullPlan(style, image);
  };

  const resetApp = () => {
    setStep('upload');
    setSelectedImage(null);
    setInspirationImage(null);
    setResultData(null);
    setSelectedStyle(StyleOption.Transitional);
  };

  // Extract resources for the "under step" view
  const extractStepResources = (text: string) => {
    const regex = /\*\*(TOOL|MATERIAL):(.*?)\*\*/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({ type: match[1] as 'TOOL' | 'MATERIAL', name: match[2].trim() });
    }
    return matches;
  };

  // Render text with highlighting and illustration placeholders
  const renderStyledText = (text: string, style: string) => {
    // 1. Remove leading number pattern like "1.", "Step 1:", "-", or "*" at start of string
    // This ensures no double numbering or list bullets appear in the bubble UI
    let cleanText = text.replace(/^(\d+\.|Step\s+\d+:?|\-|\*)\s*/i, '');
    
    // 2. Split by image tags
    const parts = cleanText.split(/(\[Image of:.*?\])/g);
    
    return parts.map((part, index) => {
      // Check for Image tag
      const imageMatch = part.match(/\[Image of:(.*?)\]/);
      if (imageMatch) {
        return <StepIllustration key={index} description={imageMatch[1].trim()} style={style} />;
      }

      // Process Bold Tool/Material tags within the text segment
      const subParts = part.split(/(\*\*(?:TOOL|MATERIAL):.*?\*\*)/g);
      return (
        <span key={index}>
          {subParts.map((subPart, subIndex) => {
            const resourceMatch = subPart.match(/\*\*(TOOL|MATERIAL):(.*?)\*\*/);
            if (resourceMatch) {
              const type = resourceMatch[1];
              const name = resourceMatch[2].trim();
              return (
                <span 
                  key={subIndex} 
                  className={`
                    inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider align-baseline mx-1 border
                    ${type === 'TOOL' 
                      ? 'bg-blue-50 text-blue-700 border-blue-100' 
                      : 'bg-orange-50 text-orange-700 border-orange-100'
                    }
                  `}
                >
                  {type === 'TOOL' ? <Wrench size={10} /> : <Leaf size={10} />}
                  {name}
                </span>
              );
            }
            return subPart;
          })}
        </span>
      );
    });
  };

  const renderResults = () => {
    if (!resultData) return null;

    if (resultData.type === 'surprise') {
      return (
        <div ref={resultsRef} className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
          <div className="flex justify-between items-center mb-10">
             <div>
                <h2 className="font-display text-4xl mb-2 text-stone-900">Surprise Me!</h2>
                <p className="text-stone-500 max-w-xl">
                  I've analyzed your {resultData.itemDescription} and found 5 distinctive vibes that would look stunning.
                </p>
             </div>
             <button onClick={resetApp} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
               <RefreshCw size={18} /> Start Over
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {resultData.suggestions.map((s, idx) => (
              <div key={idx} className="group bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300 border border-stone-100 flex flex-col">
                <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative">
                  <img src={`data:image/jpeg;base64,${s.image}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={s.style} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <h3 className="font-display text-2xl text-stone-900 mb-2">{s.style}</h3>
                <div className="mt-auto pt-4">
                  <button 
                    onClick={() => handleSurpriseSelection(s.style, s.image)}
                    className="w-full bg-stone-900 text-stone-50 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors group-hover:translate-y-0 translate-y-2 opacity-0 group-hover:opacity-100"
                  >
                    <Sparkles size={18} /> Generate Full Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const { plan, inspirationImages } = resultData;
    let stepCounter = 0; // Initialize step counter for accurate numbering

    return (
      <div ref={resultsRef} className="max-w-5xl mx-auto px-6 py-12 animate-fade-in">
        <ChatWidget plan={plan} />
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-stone-200 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider">
                {selectedCategory}
              </span>
              <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-bold uppercase tracking-wider">
                {selectedStyle || "Custom Vibe"}
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl text-stone-900 mb-4">Your Project Plan</h2>
            <p className="text-xl text-stone-600 font-light max-w-3xl leading-relaxed">
              {plan.styleSummary}
            </p>
          </div>
          <button onClick={resetApp} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-all text-sm font-medium">
            <RefreshCw size={16} /> New Project
          </button>
        </div>

        {/* Try Another Style Toolbar */}
        <div className="mb-12">
            <div className="flex items-center gap-3 mb-4 text-stone-400">
               <Sparkles size={16} />
               <span className="text-sm font-medium uppercase tracking-wider">Visualize another vibe</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_STYLES
                .filter(s => s !== selectedStyle)
                .map(style => (
                  <button
                    key={style}
                    onClick={() => generateFullPlan(style)}
                    className="px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 transition-all text-sm"
                  >
                    {style}
                  </button>
                ))}
            </div>
        </div>

        {/* Inspiration Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {inspirationImages.map((img, idx) => (
            <div key={idx} className="group relative aspect-square rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
              <img src={`data:image/jpeg;base64,${img}`} alt="Inspiration" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            </div>
          ))}
        </div>

        {/* Project Details Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden mb-12">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-100 border-b border-stone-100 bg-stone-50/50">
            <div className="p-8 flex items-center gap-5">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-stone-900">
                <DollarSignIcon />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Estimated Cost</p>
                <p className="font-display text-2xl text-stone-900">{plan.costEstimate}</p>
              </div>
            </div>
            <div className="p-8 flex items-center gap-5">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-stone-900">
                <ClockIcon />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Estimated Time</p>
                <p className="font-display text-2xl text-stone-900">{plan.timeEstimate}</p>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12">
             {/* Safety First */}
             {plan.safety.length > 0 && (
              <div className="mb-12 bg-orange-50/50 rounded-3xl p-8 border border-orange-100/50">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="text-orange-500" />
                  <h3 className="font-display text-2xl text-stone-900">Safety First</h3>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.safety.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-stone-700">
                      <CheckCircle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-12 mb-16">
              {/* Materials */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-stone-100 rounded-xl text-stone-600">
                     <Leaf size={20} />
                  </div>
                  <h3 className="font-display text-2xl text-stone-900">Materials</h3>
                </div>
                <div className="space-y-3">
                  {plan.materials.map((item, idx) => (
                    <div key={idx} className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-start gap-3">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      <span className="text-stone-700 text-sm leading-relaxed font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 bg-stone-100 rounded-xl text-stone-600">
                     <Wrench size={20} />
                  </div>
                  <h3 className="font-display text-2xl text-stone-900">Tools</h3>
                </div>
                <div className="space-y-3">
                  {plan.tools.map((item, idx) => (
                    <div key={idx} className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-start gap-3">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0" />
                      <span className="text-stone-700 text-sm leading-relaxed font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                 <div className="p-2 bg-stone-100 rounded-xl text-stone-600">
                     <Hammer size={20} />
                  </div>
                <h3 className="font-display text-3xl text-stone-900">The Process</h3>
              </div>
              
              <div className="space-y-10">
                {plan.steps.map((step, idx) => {
                  // Clean step text
                  let cleanText = step.replace(/^(\d+\.|Step\s+\d+:?|\-|\*)\s*/i, '').trim();
                  if (!cleanText) return null;

                  // Check if step is purely an image placeholder
                  const isImageOnly = /^\[Image of:.*?\]$/i.test(cleanText);

                  if (isImageOnly) {
                    return (
                      <div key={idx} className="pl-10 md:pl-16 mb-8">
                         {renderStyledText(cleanText, selectedStyle || plan.styleSummary)}
                      </div>
                    );
                  }

                  // It's a real step with text, increment counter
                  stepCounter++;
                  const resources = extractStepResources(cleanText);

                  return (
                    <div key={idx} className="relative pl-10 md:pl-16 group">
                      {/* Number Bubble - Uses dedicated counter, ignoring image-only steps */}
                      <div className="absolute left-0 top-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-stone-900 text-white flex items-center justify-center font-display text-lg shadow-lg shadow-stone-900/20 z-10">
                        {stepCounter}
                      </div>
                      
                      {/* Vertical Line */}
                      {idx !== plan.steps.length - 1 && (
                        <div className="absolute left-4 md:left-5 top-10 bottom-[-40px] w-px bg-stone-200 group-hover:bg-orange-200 transition-colors" />
                      )}

                      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-100 shadow-sm group-hover:shadow-md transition-all">
                        <p className="text-stone-700 text-lg leading-relaxed">
                          {renderStyledText(cleanText, selectedStyle || plan.styleSummary)}
                        </p>

                        {/* Resource Cards Under Step */}
                        {resources.length > 0 && (
                          <div className="mt-6 flex flex-wrap gap-3">
                            {resources.map((res, rIdx) => (
                              <div key={rIdx} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-50 border border-stone-100 w-full md:w-auto">
                                <div className={`p-2 rounded-lg ${res.type === 'TOOL' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                  {res.type === 'TOOL' ? <Wrench size={14} /> : <Leaf size={14} />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{res.type}</span>
                                  <span className="text-xs font-semibold text-stone-800">{res.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pb-12">
            <button className="flex items-center gap-3 bg-stone-900 text-white px-8 py-4 rounded-full shadow-xl shadow-stone-900/20 hover:scale-105 transition-all group">
              <Download size={20} />
              <span className="font-medium">Save Project PDF</span>
            </button>
        </div>
      </div>
    );
  };

  const DollarSignIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
  );

  const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  );

  return (
    <div className="min-h-screen font-sans bg-stone-50 text-stone-900 selection:bg-orange-100 selection:text-orange-900">
      {/* Navbar */}
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div onClick={resetApp} className="flex items-center gap-2 cursor-pointer group">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Hammer className="text-orange-500" size={20} />
            </div>
            <span className="font-display text-3xl tracking-tight text-stone-900">Homey</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {step === 'upload' && (
          <div className="max-w-4xl mx-auto px-6 py-16 animate-slide-up">
            <div className="text-center mb-16">
              <h1 className="font-display text-5xl md:text-7xl text-stone-900 mb-6 leading-tight">
                Reimagine your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
                  living space.
                </span>
              </h1>
              <p className="text-xl text-stone-500 font-light max-w-2xl mx-auto">
                Upload a photo of furniture or a room. Homey's AI will craft a custom DIY plan to transform it.
              </p>
            </div>

            {/* Step 1: Image Upload */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="mb-16"
            >
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <div className={`
                  border-3 border-dashed rounded-[2.5rem] p-12 text-center transition-all duration-300
                  ${selectedImage 
                    ? 'border-orange-500/50 bg-orange-50/30' 
                    : 'border-stone-200 hover:border-stone-400 bg-stone-50 hover:bg-stone-100'
                  }
                `}>
                  {selectedImage ? (
                    <div className="relative h-64 w-full rounded-3xl overflow-hidden shadow-lg mx-auto max-w-md">
                       <img 
                          src={`data:image/jpeg;base64,${selectedImage}`} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <p className="text-white font-medium flex items-center gap-2"><RefreshCw size={16} /> Change Photo</p>
                        </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6 text-stone-400 group-hover:scale-110 transition-transform group-hover:text-stone-900">
                        <UploadCloud size={32} />
                      </div>
                      <h3 className="font-display text-2xl text-stone-900 mb-2">Drop your photo here</h3>
                      <p className="text-stone-500 mb-6">or click to browse files</p>
                      <span className="px-4 py-2 bg-white border border-stone-200 rounded-full text-xs font-bold text-stone-400 uppercase tracking-widest">
                        JPG, PNG up to 10MB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="animate-fade-in">
              {/* Step 2: Category Select */}
              <div ref={categoryRef} className="flex items-center gap-4 mb-8">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-display text-lg">2</span>
                <span className="font-display text-2xl text-stone-900">Select Goal</span>
                <div className="h-px bg-stone-200 flex-grow" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                {[CategoryOption.FurnitureFlipping, CategoryOption.RoomRefresh].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                        setSelectedCategory(cat);
                        if (selectedImage) {
                          setTimeout(() => vibeRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
                        }
                    }}
                    className={`
                      relative p-8 rounded-[2rem] border-2 text-left transition-all duration-300 group overflow-hidden
                      ${selectedCategory === cat 
                        ? 'border-stone-900 bg-white shadow-xl shadow-stone-900/5' 
                        : 'border-transparent bg-white shadow-sm hover:shadow-md'
                      }
                    `}
                  >
                    <div className={`p-4 rounded-2xl w-fit mb-6 transition-colors ${selectedCategory === cat ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400'}`}>
                      {cat === CategoryOption.FurnitureFlipping ? <Wrench size={24} /> : <Sparkles size={24} />}
                    </div>
                    <h3 className="font-display text-2xl text-stone-900 mb-2">{cat}</h3>
                    <p className="text-stone-500 text-sm">
                      {cat === CategoryOption.FurnitureFlipping ? "Refinish, paint, or restore items." : "Decor, layout, and style upgrades."}
                    </p>
                    {selectedCategory === cat && (
                      <div className="absolute top-6 right-6 text-orange-500 animate-fade-in">
                        <CheckCircle size={24} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Step 3: Vibe Selection */}
              <div ref={vibeRef} className="flex items-center gap-4 mb-8">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-display text-lg">3</span>
                <span className="font-display text-2xl text-stone-900">Choose your Vibe</span>
                <div className="h-px bg-stone-200 flex-grow" />
              </div>

              {/* Main Grid for Styles, Upload, and Surprise Me */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
                {/* Preset Styles */}
                {PRESET_STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => handleStyleSelect(style)}
                    className={`
                      p-6 rounded-2xl border text-center transition-all duration-200 min-h-[140px] flex flex-col items-center justify-center gap-3
                      ${selectedStyle === style && !inspirationImage
                        ? 'border-stone-900 bg-stone-900 text-white shadow-lg transform scale-105 z-10' 
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50'
                      }
                    `}
                  >
                    <Sparkles size={20} className={selectedStyle === style ? 'text-orange-500' : 'text-stone-300'} />
                    <span className="block font-medium leading-tight">{style}</span>
                  </button>
                ))}

                {/* Custom Inspiration Upload Card */}
                <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleInspirationDrop}
                    className="relative col-span-2 md:col-span-1 lg:col-span-1"
                  >
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleInspirationUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className={`
                      h-full min-h-[140px] border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all text-center
                      ${inspirationImage 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-stone-300 bg-stone-50 hover:bg-white hover:border-stone-400'
                      }
                    `}>
                        {inspirationImage ? (
                          <>
                            <img src={`data:image/jpeg;base64,${inspirationImage}`} className="w-12 h-12 rounded-lg object-cover shadow-sm" alt="Inspiration" />
                            <div className="text-center">
                              <p className="text-xs font-bold text-stone-900 uppercase tracking-wider">Custom Vibe</p>
                              <button onClick={(e) => {e.preventDefault(); clearInspirationImage();}} className="z-20 text-xs text-red-500 hover:underline mt-1">
                                Remove
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="text-stone-400" />
                            <span className="text-stone-500 font-medium text-sm">Upload Inspiration</span>
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Drag & Drop</span>
                          </>
                        )}
                    </div>
                </div>

                {/* Surprise Me Card */}
                <button
                  onClick={() => { setSelectedStyle(StyleOption.SurpriseMe); setInspirationImage(null); }}
                  className={`
                    col-span-2 md:col-span-1 lg:col-span-1
                    p-6 rounded-2xl border text-center transition-all duration-200 min-h-[140px] flex flex-col items-center justify-center gap-3 relative overflow-hidden group
                    ${selectedStyle === StyleOption.SurpriseMe
                      ? 'border-transparent ring-2 ring-stone-900' 
                      : 'border-transparent'
                    }
                  `}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                  <Gift size={24} className="text-white relative z-10" />
                  <span className="block font-bold text-white relative z-10">Surprise Me!</span>
                  <span className="text-[10px] text-white/80 relative z-10 font-medium">I'll pick 5 styles for you</span>
                </button>
              </div>

              {/* Main Submit Action */}
              <div className="flex flex-col items-center gap-4 mt-8">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedImage}
                  className={`
                    w-full max-w-md h-16 rounded-full font-bold text-lg flex items-center justify-center gap-3 transition-all
                    ${selectedImage 
                      ? 'bg-stone-900 text-white shadow-xl shadow-stone-900/20 hover:scale-[1.02] hover:shadow-2xl hover:shadow-stone-900/30' 
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }
                  `}
                >
                  <Sparkles className={selectedImage ? "text-orange-500" : "text-stone-300"} />
                  <span>
                    {!selectedImage ? "Upload Image to Start" : (selectedStyle === StyleOption.SurpriseMe ? "Surprise Me!" : "Generate Plan")}
                  </span>
                  <ArrowRight size={20} className={selectedImage ? "text-stone-500 group-hover:text-white transition-colors" : "text-stone-300"} />
                </button>
                <p className="text-stone-400 text-sm">AI-powered renovation plans in seconds</p>
              </div>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="relative mb-8">
               <div className="w-24 h-24 border-4 border-stone-100 rounded-full"></div>
               <div className="absolute inset-0 w-24 h-24 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
               <Sparkles className="absolute inset-0 m-auto text-stone-300 animate-pulse" size={32} />
            </div>
            <h2 className="font-display text-3xl text-stone-900 mb-2">Dreaming up your space...</h2>
            <p className="text-stone-500 max-w-sm text-center">
              Homey is analyzing your photo, searching for {selectedStyle === StyleOption.SurpriseMe ? 'creative ideas' : 'real-world references'}, and drafting the perfect plan.
            </p>
          </div>
        )}

        {step === 'results' && renderResults()}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in px-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h2 className="font-display text-3xl text-stone-900 mb-2">Oops, renovation snag.</h2>
            <p className="text-stone-500 max-w-md text-center mb-8">
              {errorMessage}
            </p>
            <button
              onClick={() => setStep('upload')}
              className="px-8 py-3 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface CreateMarketRequest {
    question: string;
    outcomes: string[];
    deadline: number; // microseconds
    applicationId: string;
}

export async function POST(req: NextRequest) {
    try {
        const body: CreateMarketRequest = await req.json();
        const { question, outcomes, deadline, applicationId } = body;

        // Validate inputs
        if (!question || !outcomes || outcomes.length < 2 || !deadline || !applicationId) {
            return NextResponse.json(
                { 
                    error: 'Missing required fields: question, outcomes (min 2), deadline, applicationId' 
                },
                { status: 400 }
            );
        }

        // Prepare operation JSON
        const operation = {
            RegisterMarket: {
                question,
                outcomes,
                deadline,
                callback_data: [],
            },
        };

        const operationJson = JSON.stringify(operation);

        // Execute Linera command
        // Use full path to linera CLI to avoid PATH issues
        const lineraPath = process.env.LINERA_PATH || '/home/mdlog/.cargo/bin/linera';
        
        // Prepare arguments
        const args = [
            'execute-operation',
            '--application-id', applicationId,
            '--operation', operationJson,
        ];

        console.log('Executing Linera command:', lineraPath, args.join(' '));

        const { stdout, stderr } = await execFileAsync(lineraPath, args, {
            timeout: 30000, // 30 seconds timeout
            env: {
                ...process.env,
                PATH: `${process.env.PATH || ''}:/home/mdlog/.cargo/bin:/home/mdlog/.local/bin`,
                HOME: process.env.HOME || '/home/mdlog',
            },
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });

        if (stderr && !stderr.includes('Warning') && !stderr.includes('info')) {
            console.error('Linera stderr:', stderr);
            // Don't fail on warnings/info messages
            if (stderr.toLowerCase().includes('error')) {
                return NextResponse.json(
                    { 
                        error: 'Failed to execute operation',
                        details: stderr 
                    },
                    { status: 500 }
                );
            }
        }

        // Parse output to extract transaction hash or market ID
        const output = stdout.trim();
        
        return NextResponse.json({
            success: true,
            message: 'Market created successfully',
            output: output,
        });

    } catch (error: any) {
        console.error('Error creating market:', error);
        
        // Handle timeout
        if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
            return NextResponse.json(
                { 
                    error: 'Operation timeout',
                    details: 'The operation took too long to complete'
                },
                { status: 504 }
            );
        }

        // Handle command not found
        if (error.code === 'ENOENT' || error.message?.includes('linera')) {
            return NextResponse.json(
                { 
                    error: 'Linera CLI not found',
                    details: `Linera CLI not found at ${process.env.LINERA_PATH || '/home/mdlog/.cargo/bin/linera'}. Please ensure Linera CLI is installed. Error: ${error.message}`
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { 
                error: 'Failed to create market',
                details: error.message || 'Unknown error'
            },
            { status: 500 }
        );
    }
}


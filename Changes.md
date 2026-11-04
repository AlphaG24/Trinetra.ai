Now for customer architecture we have 2 options :
1. Our own custom made pipeline using livekit cloud , groq , sarvam for voice , exotel for telephony layer , whatsapp & gmail for notification and razorpay for payment.
2. The pipeline that sarvam is showing to implement using livekit cloud and custom script.

Now I want our own controlled system as everything working perfectly in our own pipeline smoothly including all the scenarios , features and functions customer db , leads , appointement booking , callback schedulig , campaign calls , revenue or price dashboard ,  custom instruction , knowledge base , custom greeting , custom voices  , calls according to the information and detail ,
1. if callback then according to this not like a new call ,
2. if caller is new then saving his information if become one ,
3.  if customer was old then direct adddressing so that even customer feels personal , asking about his previous call reasons solved or about his health or so on , 
4.notification about appointement to both user and caller right now and a reminder before 1 hr , 5. automatic call according to scheduled callback and according to the reason for which the call has been booked, on the spot checking 
6. like for price , appontements , routes availale(like for business like purvi roadlines) or any other business i.e. a separate knowledge base that contains regular information from which it scnas for real output and then tells to customer and this will be updated knowledge like daily bookings according to time ( udated by aget automatically so that real time data fetching can be done perfectly and no slots overlaps) , if user have business of transport then avaliable loads , vehicles , packages with min. prices so that agent can easily negotiate about price , if container business then available containers , available customers with needs and buyers etc. and so many other type of real data can be stored that will act as a brain for agent during live call so that rela data is being used during calls . 

NUMBER SYSTEM:

1.Number purchasing with 15 days of grace period after expiry before alloting to someone else and notification from 1 -5- 7- 15 day after that number return to pool and available to give to someone else.
2.Notification before expiring that your number is expiring 
3.Numbers can be assigned only to agents that have paid plans like either 99rs trial period or any other paid plan 
4. If any either agent or number is expired the number immediateky excluded from the agent so that it can't be used any further.
5. The agent can only be remain connected to agent if number is not expired and agent's time has expired but still quota minutes left.
6. The numebr are only open to paid plan memebrs and those who have done their KYC 
omly then user can have number 
7. During the grace period the user can rebuy the number and can use again and that number will be only showing inn grace section to that user only.

AGENT RULES :

1. A user have 3 options for buying an agent 
Free tier : Limited use of dashboard , one agent only , one time per account only , no number access , 10min for the selected agent , only web calls are allowed , validity for 5 days .
99rs trial : A user can pay 99rs and full dashboard access to that agent , can assign number ( must complete KYC before that ) , can perform 1 campaign , and full use with all pages , 1 agent only allowed for trial as well , once 99rs trial is buy or completed free trials and 99rs trial are blocked for all agents then he have to buy any other plan , validity of 7 days for agent to use , 25min for the quota for this trial(admin editable ) (price and number of agentts are admin editable ) .
RULE : During those plans the buffer limits are closed exceptionally i.e. can't be claimed until user have a verified paid plan as during this time the credit score must be 0 . 
Paid plans : Here user haev multiple plans like starter , professional , pay as you go , output based plans , custom plans . For every plan like starter have limit of 2 agents , professional have limit of 5 agents and no limit to custom or enterprise plans (no. of agents , prices , quota , price cards , settings etc. are admin editable via his panel ).

In all those panels the used can access full dashboard , can use all features , every functionality , every page i.e. full access to dashboard . 

Agents are expired only when their quota minutes are finished , buffer minutes are finished if calimed or available and prepaid wallet is allowed and used or empty ,  no call dropping even if quota is finished i.e. mid call should never cut , user can claim buffer minutes if credit score is above it's required points and those are not available every month , once buffer is claimed the credit score will be decreased and user have to power it up , the credit score will increase according to user's usage i.e. more use and on time payemnt faster credit score just like real credit score works. 

Agents can no longer be used once expired their quota and all other 3 tier usage anywhere . It will be completely blocked and user have to renew to use it again . IF user didn't renew his agent for more than 30 days then delete the agent from his dashboard. 
Norify user regarding all the information like agent setup , agent usage , number usage , alerts , notifications on all connected apps liek mail , whatsapp , telegram etc.

AGENTS RULE :

1. The user can setup the agent by giving his detail and agent will be setup on that information directly and will use that information on any call 
2. It will use the knowledge base for company information like their services , working , schedules etc. Custom instructions to enhance the prompt , add something extra like festive offer , extra discount or any other type of instruction that user want his agent to use and can remove easily as well when task is done.
Voice settings matched and use realtime. Leads , analytics , callbacks , appointements are updated live.
3. Agent will fetch details live and update or use them directly .
4. We will build one more page where the regular business details will be updated like daily appointements ,slots , bookings , products , routes , prices , buyers , sellers etc. so that agent can fetch this directly and can use directly during call so that real information can be used and can be uodated directly so that no overlap will happed]n.
5. If any callback is scheduled , then agent must call at that specific time and ask user that they ask fro callback and tell then confirm the reason and finaly close the deal , it should not sound like a fresh new call 
6. The agent must use all the details given during the campaign like customer name , details , company , business details , reason of calling , exeetra notes so that agent can talk personally using their business details , real facts , asking them like customer then put his point and such type of techniques.
7. After those call if user isn't available or someone else pickup the call then reschedule their calls , if user rejects then simply add them in not intereseted or rejected or never call back , if he satisfies and agreed ask for something like demo links or business detail or payment detaisl send immediately even during call and let caller even know that details are sended . 
8. If any whatsapp message contains payment realted talk then collect the logs , their receit i.e. invoice that will be used for our cash to call feature or revernue dashboard 
After camapign the campaign report to owner and related message like any further assistance , future help , appointement or anything else to caller 
9. During those calls if user is a previous customer then agent directly call them by their name to make them feel personalized ask them about their last reason like " aapki payment last time ho gyi thi na time pe " or " aapki tabiyat kaisi hai " or if user call to change their appointement or update their order or to know about their query then live data updation and fetching like appointement schedule editing , changing or removing , query resolving and live tracking , updating their order then all those are done realtime to db or new knowledge page and notify to both customer and owner.
10. The agent always feel natural , calm and sharp enough to handle distinctive or unexpected situations easily , never use or listen abusive language , never use same word or sentences multiple times , use name only twice once at starting the call and second during wnding th call , no over use of name , "ji" or ay such words.
ACCOUNT POLICIES:

1. If user click to delete or download his data then it must owrk and ensure proper deletion of data or downloading their data.
( No audit logs , consent logs , trnasaction logs etc. will be touched or deleted as they are immutable according to rules )
2. The 2 FA must work and the password change , details change will also work realtime , user can't change their mail , the account deletion mail and data downlaod notification will be sended to user , the notification system must work i.e. accordint to the preferences saved in settings of features in mail , whstapp , dashboard . 
The buttons like quiet hours and digest mode will also work as per their use.
Telegram notifications will also work if user had connected their bot. 

PAYMENT RULES:

1. User can buy trial , separate agent , bundles , numbers .
2. For bundles if user buy a bundle with an agent and number , so once setup the available number will be automatically assigned to the agent and ready working agent will user get. 
3. The prices are admin editable includign GST details as we can't collect GST from foreign customers . 
4. The discount coupons can be used , automatic  prepaid wallet credit use must work 
5. For every payment a user will get their invoice from our side that we create from the software I asked you to attach , their we will create and design custom invoice template that can be used for payment to other users .
6. For our customers they also get an option for custom invoice which they can build and upload with their payment details so that once payment is done from their customer side the invoice from our customer side can be seneded to their customer.
7. User can fill their GST number so that he can claim GST later and their GST number used for payment will be stored in our ledger in payment details so that we can also claim our .
8. Live update in recent activity will be shown 
9. A user can't have more than 5 numbers until ha have more agents if he needs more then need to raise support ticket to admin to allow for more numbers.
All the information that needs to be changable and editable must be admin editable like prices , limits , quota , number allocation etc. 

RULE : Search entire codebase for Trinetra and replace it from trinetra -> vaakriti 

2. The agents are strictly prohibited to use their personlaity for their name  like " main sales agent bol rha hu " he must either use their voice names or the name given by user . 
3. Remove visit website button from profile dropdown.
4. When in dashboard and going on overview page use our logo loader to show there . 
5. Update our privacy policy , refund policy , cookies and all other policies according to our latest all rules and securities we are following .
6. All those rules are applicable to both Indian customers and foreign customers , as we already implemented the system to use the location to use providers accordingly . 
For foreign clients : Twilio + 11labs will be used
7. A user can clone their voices and can use them for their voice agents . 
8. The pricing page listed in homepage , it must fetch the real price details from admin panel and does not show any random price and their details they all must be editable and set directly via admin pane.
9. Need a proper security audit from frontend to backend and db to ensure everything is safe and secure . Find some repo's that are used for security checks and attack simulations to find out the nugs and issues so that we can ensure that secrurity we are using is correct and worth believing . Some repo I find like claude red , ECC that can help us in searching risk factors and their eliminations.
10. Outbound calls done via homepage take name of the caller so when the agent calls it must use the caller name to address him. 
11. Clarify one thing that our whatsapp number is now used for notifications to our customers , and what about their customers like if they didn't connect then their messages will also be sended via that number but it was our official vaakriti number so everyone see vaakriti as branding . Although it is better for our branding but then also ? 
12. After every call the call details like transcripts and audio must be sent to user whatsapp or mail .
13. Currently the number can just send details but when someone did payment and at last messahe it is wirtten that once payment is done send the screenshot and UTR so that we can verify but this message actaully goes nowhere , so what about that type og messaging  handling to make our whatsapp bot as well intelligent and capable . 
14. When the call is regarding any family member or customer wants to talk to owner then forward teh call to owner directly so that the discussion can be carry forwarded into real human perception. 
Also there may be some other scenarios where need to forward the call to owner then also do this thing.

Our aim is to achieve <100 ms latency to achieve like sarvam. Now we have to choose the pipeline very strategically , as our main custom pipleine is already built and ready just need polishing so that the lags , voice cracking , smooth voice and fast reposnes will start . Once those issues are eliminated our pipleine is best . So tell me about it that what should we choose and how do we achieve our latency aim . Can it be done without server or need a dedicated server . 

I have written nearly all rules and scenarios that are needed in our pplatform and wokring of our entire platform . Here I aksed some questions and some new features and some just need verifications that they are wokring or not.

So first anwer my questions , then check for those features those are already implemented and verify that they are working as well in our custom pipeline flawlessly . Then we will start working on few remaining new features and fixes. 


2. Phase 6: Voice Pipeline Latency Hardening (<100ms Target)

Per Changes.md Item 91

Streaming Pipeline Architecture: Evaluate dedicated WebSocket streaming audio chunking vs. LiveKit server-side agent.
Provider Routing: Optimize Indian routes (Exotel + Sarvam/Groq streaming) vs. Global routes (Twilio + ElevenLabs/Deepgram).
Anti-Jitter & Filler Management: Eliminate audio crackles, optimize conversational turn-taking, and tune VAD (Voice Activity Detection) sensitivity.
3. Phase 7: WhatsApp Bot Intelligence (UTR & Payment Screenshot Verification)

Per Changes.md Items 48, 66, 87

In-Call Payment to Cash Verification: When customer pays via UPI/QR received during or after a call and submits UTR / screenshot on WhatsApp:
Vision/OCR parsing of payment receipts.
Automatic reconciliation against generated invoices and orders in the Cash-to-Call ledger.
Automated confirmation dispatch back to the caller and business owner.
4. Phase 8: Comprehensive Security Red-Teaming & Attack Simulations

Per Changes.md Item 83 & Master Plan Section 18.2

Run automated security scanners and attack simulations (evaluating prompt injection, SQL injection attempts, bypass vectors, race conditions on checkout/wallet balance, and token expiration).
Verify all audit logs and immutable compliance registers remain tamper-proof.
5. Phase 9: Carrier Live Verification & Founding Launch
Live SIP/DLT carrier registration verification.
Final production smoke tests on real mobile phones across Airtel, Jio, and Vi networks.